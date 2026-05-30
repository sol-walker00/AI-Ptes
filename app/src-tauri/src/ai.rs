use std::collections::BTreeMap;

use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    pub provider_id: String,
    pub protocol: String,
    pub auth: String,
    pub base_url: String,
    pub model: String,
    pub temperature: f32,
    #[serde(default)]
    pub custom_headers: BTreeMap<String, String>,
    pub messages: Vec<ChatMessage>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatResponse {
    pub text: String,
}

#[derive(Debug, Error)]
pub enum AiError {
    #[error("api key is missing")]
    MissingApiKey,
    #[error("authentication failed")]
    Authentication,
    #[error("rate limited")]
    RateLimited,
    #[error("request timed out")]
    Timeout,
    #[error("network request failed: {0}")]
    Network(String),
    #[error("model returned an invalid response")]
    InvalidResponse,
}

#[derive(Debug, Serialize)]
struct OpenAiRequest<'a> {
    model: &'a str,
    messages: &'a [ChatMessage],
    temperature: f32,
}

#[derive(Debug, Deserialize)]
struct OpenAiResponse {
    choices: Vec<OpenAiChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    message: ChatMessage,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AnthropicRequest<'a> {
    model: &'a str,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    messages: Vec<ChatMessage>,
    temperature: f32,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum AnthropicContent {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(other)]
    Other,
}

#[derive(Debug, Serialize)]
struct OpenAiResponsesRequest<'a> {
    model: &'a str,
    input: String,
    temperature: f32,
}

#[derive(Debug, Deserialize)]
struct OpenAiResponsesResponse {
    output_text: Option<String>,
    #[serde(flatten)]
    raw: Value,
}

pub async fn send_chat(request: ChatRequest, api_key: String) -> Result<ChatResponse, AiError> {
    if request.auth != "none" && api_key.trim().is_empty() {
        return Err(AiError::MissingApiKey);
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|error| AiError::Network(error.to_string()))?;

    match request.protocol.as_str() {
        "anthropic-messages" => send_anthropic_messages(&client, &request, &api_key).await,
        "openai-responses" => send_openai_responses(&client, &request, &api_key).await,
        "gemini-openai" | "openai-chat" => send_openai_chat(&client, &request, &api_key).await,
        _ => send_openai_chat(&client, &request, &api_key).await,
    }
}

async fn send_openai_chat(
    client: &reqwest::Client,
    request: &ChatRequest,
    api_key: &str,
) -> Result<ChatResponse, AiError> {
    let url = format!("{}/chat/completions", request.base_url.trim_end_matches('/'));
    let response = apply_headers(client.post(url), request, api_key)
        .json(&OpenAiRequest {
            model: &request.model,
            messages: &request.messages,
            temperature: request.temperature,
        })
        .send()
        .await
        .map_err(map_request_error)?;

    ensure_success(response.status())?;
    let body = response
        .json::<OpenAiResponse>()
        .await
        .map_err(|_| AiError::InvalidResponse)?;
    let text = body
        .choices
        .first()
        .map(|choice| choice.message.content.trim().to_string())
        .filter(|text| !text.is_empty())
        .ok_or(AiError::InvalidResponse)?;

    Ok(ChatResponse { text })
}

async fn send_anthropic_messages(
    client: &reqwest::Client,
    request: &ChatRequest,
    api_key: &str,
) -> Result<ChatResponse, AiError> {
    let url = format!("{}/messages", request.base_url.trim_end_matches('/'));
    let (system, messages) = split_system_messages(&request.messages);
    let response = apply_headers(client.post(url), request, api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&AnthropicRequest {
            model: &request.model,
            max_tokens: 512,
            system: if system.is_empty() { None } else { Some(system) },
            messages,
            temperature: request.temperature,
        })
        .send()
        .await
        .map_err(map_request_error)?;

    ensure_success(response.status())?;
    let body = response
        .json::<AnthropicResponse>()
        .await
        .map_err(|_| AiError::InvalidResponse)?;
    let text = body
        .content
        .into_iter()
        .find_map(|part| match part {
            AnthropicContent::Text { text } if !text.trim().is_empty() => {
                Some(text.trim().to_string())
            }
            _ => None,
        })
        .ok_or(AiError::InvalidResponse)?;

    Ok(ChatResponse { text })
}

async fn send_openai_responses(
    client: &reqwest::Client,
    request: &ChatRequest,
    api_key: &str,
) -> Result<ChatResponse, AiError> {
    let url = format!("{}/responses", request.base_url.trim_end_matches('/'));
    let response = apply_headers(client.post(url), request, api_key)
        .json(&OpenAiResponsesRequest {
            model: &request.model,
            input: messages_to_prompt(&request.messages),
            temperature: request.temperature,
        })
        .send()
        .await
        .map_err(map_request_error)?;

    ensure_success(response.status())?;
    let body = response
        .json::<OpenAiResponsesResponse>()
        .await
        .map_err(|_| AiError::InvalidResponse)?;
    let text = body.output_text.or_else(|| extract_responses_text(&body.raw));
    let text = text
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
        .ok_or(AiError::InvalidResponse)?;

    Ok(ChatResponse { text })
}

fn apply_headers(
    mut builder: reqwest::RequestBuilder,
    request: &ChatRequest,
    api_key: &str,
) -> reqwest::RequestBuilder {
    builder = match request.auth.as_str() {
        "x-api-key" => builder.header("x-api-key", api_key),
        "none" => builder,
        _ => builder.bearer_auth(api_key),
    };

    for (name, value) in &request.custom_headers {
        if !name.trim().is_empty() && !value.trim().is_empty() {
            builder = builder.header(name, value);
        }
    }

    builder
}

fn ensure_success(status: StatusCode) -> Result<(), AiError> {
    match status {
        StatusCode::UNAUTHORIZED => Err(AiError::Authentication),
        StatusCode::TOO_MANY_REQUESTS => Err(AiError::RateLimited),
        status if !status.is_success() => Err(AiError::Network(status.to_string())),
        _ => Ok(()),
    }
}

fn map_request_error(error: reqwest::Error) -> AiError {
    if error.is_timeout() {
        AiError::Timeout
    } else {
        AiError::Network(error.to_string())
    }
}

fn split_system_messages(messages: &[ChatMessage]) -> (String, Vec<ChatMessage>) {
    let system = messages
        .iter()
        .filter(|message| message.role == "system")
        .map(|message| message.content.as_str())
        .collect::<Vec<_>>()
        .join("\n\n");
    let mut conversational = messages
        .iter()
        .filter(|message| message.role != "system")
        .cloned()
        .collect::<Vec<_>>();

    if conversational.is_empty() {
        conversational.push(ChatMessage {
            role: "user".to_string(),
            content: system.clone(),
        });
    }

    (system, conversational)
}

fn messages_to_prompt(messages: &[ChatMessage]) -> String {
    messages
        .iter()
        .map(|message| format!("{}: {}", message.role, message.content))
        .collect::<Vec<_>>()
        .join("\n\n")
}

fn extract_responses_text(value: &Value) -> Option<String> {
    value
        .get("output")
        .and_then(Value::as_array)
        .and_then(|items| {
            items.iter().find_map(|item| {
                item.get("content")
                    .and_then(Value::as_array)
                    .and_then(|content| {
                        content.iter().find_map(|part| {
                            part.get("text")
                                .and_then(Value::as_str)
                                .or_else(|| part.get("content").and_then(Value::as_str))
                                .map(ToString::to_string)
                        })
                    })
            })
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use httpmock::prelude::*;

    fn messages() -> Vec<ChatMessage> {
        vec![
            ChatMessage {
                role: "system".to_string(),
                content: "你是桌面宠物。".to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: "你好".to_string(),
            },
        ]
    }

    #[tokio::test]
    async fn openai_chat_adapter_posts_chat_completions() {
        let server = MockServer::start();
        let mock = server.mock(|when, then| {
            when.method(POST)
                .path("/chat/completions")
                .header("authorization", "Bearer sk-test")
                .body_includes(r#""model":"deepseek-v4-flash""#);
            then.status(200)
                .json_body_obj(&serde_json::json!({
                    "choices": [{ "message": { "role": "assistant", "content": "喵。" } }]
                }));
        });

        let response = send_chat(
            ChatRequest {
                provider_id: "deepseek".to_string(),
                protocol: "openai-chat".to_string(),
                auth: "bearer".to_string(),
                base_url: server.url(""),
                model: "deepseek-v4-flash".to_string(),
                temperature: 0.7,
                custom_headers: BTreeMap::new(),
                messages: messages(),
            },
            "sk-test".to_string(),
        )
        .await
        .expect("openai chat response");

        mock.assert();
        assert_eq!(response.text, "喵。");
    }

    #[tokio::test]
    async fn anthropic_adapter_posts_messages_with_anthropic_headers() {
        let server = MockServer::start();
        let mock = server.mock(|when, then| {
            when.method(POST)
                .path("/messages")
                .header("x-api-key", "sk-claude")
                .header("anthropic-version", "2023-06-01")
                .body_includes(r#""model":"claude-sonnet-4-20250514""#)
                .body_includes(r#""system":"你是桌面宠物。""#);
            then.status(200)
                .json_body_obj(&serde_json::json!({
                    "content": [{ "type": "text", "text": "我在。" }]
                }));
        });

        let response = send_chat(
            ChatRequest {
                provider_id: "anthropic".to_string(),
                protocol: "anthropic-messages".to_string(),
                auth: "x-api-key".to_string(),
                base_url: server.url(""),
                model: "claude-sonnet-4-20250514".to_string(),
                temperature: 0.7,
                custom_headers: BTreeMap::new(),
                messages: messages(),
            },
            "sk-claude".to_string(),
        )
        .await
        .expect("anthropic response");

        mock.assert();
        assert_eq!(response.text, "我在。");
    }

    #[tokio::test]
    async fn openai_responses_adapter_posts_responses() {
        let server = MockServer::start();
        let mock = server.mock(|when, then| {
            when.method(POST)
                .path("/responses")
                .header("authorization", "Bearer sk-openai")
                .body_includes(r#""model":"gpt-5-mini""#);
            then.status(200)
                .json_body_obj(&serde_json::json!({ "output_text": "收到。" }));
        });

        let response = send_chat(
            ChatRequest {
                provider_id: "openai".to_string(),
                protocol: "openai-responses".to_string(),
                auth: "bearer".to_string(),
                base_url: server.url(""),
                model: "gpt-5-mini".to_string(),
                temperature: 0.7,
                custom_headers: BTreeMap::new(),
                messages: messages(),
            },
            "sk-openai".to_string(),
        )
        .await
        .expect("responses api response");

        mock.assert();
        assert_eq!(response.text, "收到。");
    }
}
