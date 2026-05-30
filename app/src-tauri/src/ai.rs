use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
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
    pub base_url: String,
    pub model: String,
    pub temperature: f32,
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

pub async fn send_chat(request: ChatRequest, api_key: String) -> Result<ChatResponse, AiError> {
    if api_key.trim().is_empty() {
        return Err(AiError::MissingApiKey);
    }

    let url = format!("{}/chat/completions", request.base_url.trim_end_matches('/'));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|error| AiError::Network(error.to_string()))?;

    let response = client
        .post(url)
        .bearer_auth(api_key)
        .json(&OpenAiRequest {
            model: &request.model,
            messages: &request.messages,
            temperature: request.temperature,
        })
        .send()
        .await
        .map_err(|error| {
            if error.is_timeout() {
                AiError::Timeout
            } else {
                AiError::Network(error.to_string())
            }
        })?;

    match response.status() {
        StatusCode::UNAUTHORIZED => return Err(AiError::Authentication),
        StatusCode::TOO_MANY_REQUESTS => return Err(AiError::RateLimited),
        status if !status.is_success() => return Err(AiError::Network(status.to_string())),
        _ => {}
    }

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
