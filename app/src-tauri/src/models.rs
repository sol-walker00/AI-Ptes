use serde::{Deserialize, Serialize};

pub const DEFAULT_MODEL_BASE_URL: &str = "https://api.deepseek.com";
pub const DEFAULT_MODEL_NAME: &str = "deepseek-v4-flash";
const LEGACY_BUILT_IN_MODEL_BASE_URL: &str = "https://api.openai.com/v1";
const LEGACY_BUILT_IN_MODEL_NAME: &str = "gpt-4.1-mini";

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
    pub base_url: String,
    pub model: String,
    pub temperature: f32,
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
                base_url: DEFAULT_MODEL_BASE_URL.to_string(),
                model: DEFAULT_MODEL_NAME.to_string(),
                temperature: 0.7,
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
        if self.settings.base_url == LEGACY_BUILT_IN_MODEL_BASE_URL
            && self.settings.model == LEGACY_BUILT_IN_MODEL_NAME
        {
            self.settings.base_url = DEFAULT_MODEL_BASE_URL.to_string();
            self.settings.model = DEFAULT_MODEL_NAME.to_string();
        }

        self
    }
}
