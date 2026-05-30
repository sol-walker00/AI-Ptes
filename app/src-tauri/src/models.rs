use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

pub const DEFAULT_MODEL_BASE_URL: &str = "https://api.deepseek.com";
pub const DEFAULT_MODEL_NAME: &str = "deepseek-v4-flash";
const LEGACY_BUILT_IN_MODEL_BASE_URL: &str = "https://api.openai.com/v1";
const LEGACY_BUILT_IN_MODEL_NAME: &str = "gpt-4.1-mini";
const DEFAULT_PROVIDER_ID: &str = "deepseek";
const DEFAULT_PROVIDER_PROTOCOL: &str = "openai-chat";
const DEFAULT_PROVIDER_AUTH: &str = "bearer";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PetProfile {
    pub name: String,
    pub species: String,
    pub persona_id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PetState {
    pub mood: String,
    pub hunger: u8,
    pub energy: u8,
    pub intimacy: u8,
    pub action: String,
    pub last_interaction_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PetEvent {
    pub id: String,
    pub kind: String,
    pub created_at: String,
    pub intensity: f32,
    pub quality: f32,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModelSettings {
    #[serde(default)]
    pub provider_id: String,
    #[serde(default)]
    pub protocol: String,
    #[serde(default)]
    pub auth: String,
    pub base_url: String,
    pub model: String,
    pub temperature: f32,
    #[serde(default)]
    pub custom_headers: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MemorySummary {
    pub facts: Vec<String>,
    pub recent_summary: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppData {
    pub profile: Option<PetProfile>,
    pub state: Option<PetState>,
    pub settings: ModelSettings,
    pub memory: MemorySummary,
    #[serde(default)]
    pub events: Vec<PetEvent>,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            profile: None,
            state: None,
            settings: ModelSettings {
                provider_id: DEFAULT_PROVIDER_ID.to_string(),
                protocol: DEFAULT_PROVIDER_PROTOCOL.to_string(),
                auth: DEFAULT_PROVIDER_AUTH.to_string(),
                base_url: DEFAULT_MODEL_BASE_URL.to_string(),
                model: DEFAULT_MODEL_NAME.to_string(),
                temperature: 0.7,
                custom_headers: BTreeMap::new(),
            },
            memory: MemorySummary {
                facts: Vec::new(),
                recent_summary: String::new(),
                updated_at: chrono::Utc::now().to_rfc3339(),
            },
            events: Vec::new(),
        }
    }
}

impl AppData {
    pub fn migrate_built_in_model_settings(mut self) -> Self {
        let provider_id = if self.settings.provider_id.trim().is_empty() {
            infer_provider_id(&self.settings.base_url).to_string()
        } else {
            self.settings.provider_id.clone()
        };

        self.settings.provider_id = provider_id.clone();
        if self.settings.protocol.trim().is_empty() {
            self.settings.protocol = protocol_for_provider(&provider_id).to_string();
        }
        if self.settings.auth.trim().is_empty() {
            self.settings.auth = auth_for_provider(&provider_id).to_string();
        }

        if self.settings.base_url == LEGACY_BUILT_IN_MODEL_BASE_URL
            && self.settings.model == LEGACY_BUILT_IN_MODEL_NAME
        {
            self.settings.provider_id = DEFAULT_PROVIDER_ID.to_string();
            self.settings.protocol = DEFAULT_PROVIDER_PROTOCOL.to_string();
            self.settings.auth = DEFAULT_PROVIDER_AUTH.to_string();
            self.settings.base_url = DEFAULT_MODEL_BASE_URL.to_string();
            self.settings.model = DEFAULT_MODEL_NAME.to_string();
        }

        self
    }
}

fn infer_provider_id(base_url: &str) -> &'static str {
    let normalized = base_url.to_ascii_lowercase();
    if normalized.contains("deepseek.com") {
        "deepseek"
    } else if normalized.contains("api.openai.com") {
        "openai"
    } else if normalized.contains("anthropic.com") {
        "anthropic"
    } else if normalized.contains("generativelanguage.googleapis.com") {
        "gemini"
    } else if normalized.contains("dashscope") {
        "qwen"
    } else if normalized.contains("moonshot.ai") {
        "kimi"
    } else if normalized.contains("api.z.ai") {
        "zai"
    } else if normalized.contains("openrouter.ai") {
        "openrouter"
    } else if normalized.contains("siliconflow") {
        "siliconflow"
    } else if normalized.contains("localhost:11434") || normalized.contains("127.0.0.1:11434") {
        "ollama"
    } else {
        "custom"
    }
}

fn protocol_for_provider(provider_id: &str) -> &'static str {
    match provider_id {
        "openai" => "openai-responses",
        "anthropic" => "anthropic-messages",
        "gemini" => "gemini-openai",
        _ => "openai-chat",
    }
}

fn auth_for_provider(provider_id: &str) -> &'static str {
    match provider_id {
        "anthropic" => "x-api-key",
        "ollama" => "none",
        _ => "bearer",
    }
}
