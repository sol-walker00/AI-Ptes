use std::{fs, path::PathBuf};

use directories::ProjectDirs;
use thiserror::Error;

use crate::models::AppData;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("application data directory is unavailable")]
    DataDirUnavailable,
    #[error("file operation failed: {0}")]
    Io(#[from] std::io::Error),
    #[error("failed to serialize data: {0}")]
    Serialize(#[from] serde_json::Error),
}

#[derive(Debug, Clone)]
pub struct LocalStore {
    data_dir: PathBuf,
}

impl LocalStore {
    pub fn new() -> Result<Self, StorageError> {
        let project_dirs = ProjectDirs::from("com", "ai-pet", "DesktopAiPet")
            .ok_or(StorageError::DataDirUnavailable)?;
        Ok(Self {
            data_dir: project_dirs.data_local_dir().to_path_buf(),
        })
    }

    #[cfg(test)]
    pub fn new_for_tests(data_dir: PathBuf) -> Self {
        Self { data_dir }
    }

    fn data_file(&self) -> PathBuf {
        self.data_dir.join("app-data.json")
    }

    pub fn load_app_data(&self) -> Result<AppData, StorageError> {
        let path = self.data_file();
        if !path.exists() {
            return Ok(AppData::default());
        }
        let contents = fs::read_to_string(path)?;
        match serde_json::from_str::<AppData>(&contents) {
            Ok(data) => Ok(data.migrate_built_in_model_settings()),
            Err(_) => {
                let _ = fs::write(self.data_dir.join("app-data.corrupt.json"), contents);
                Ok(AppData::default())
            }
        }
    }

    pub fn save_app_data(&self, data: &AppData) -> Result<(), StorageError> {
        fs::create_dir_all(&self.data_dir)?;
        let contents = serde_json::to_string_pretty(data)?;
        fs::write(self.data_file(), contents)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::AppData;

    #[test]
    fn save_and_load_round_trip_app_data() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = LocalStore::new_for_tests(dir.path().to_path_buf());
        let data = AppData::default();

        store.save_app_data(&data).expect("save app data");
        let loaded = store.load_app_data().expect("load app data");

        assert_eq!(loaded.settings.base_url, "https://api.deepseek.com");
        assert_eq!(loaded.settings.model, "deepseek-v4-flash");
        assert_eq!(loaded.memory.facts.len(), 0);
    }

    #[test]
    fn corrupted_app_data_falls_back_to_default_and_is_backed_up() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = LocalStore::new_for_tests(dir.path().to_path_buf());
        fs::create_dir_all(dir.path()).expect("create data dir");
        fs::write(store.data_file(), "{not valid json").expect("write corrupted data");

        let loaded = store.load_app_data().expect("load default data");

        assert_eq!(loaded.settings.base_url, "https://api.deepseek.com");
        assert_eq!(loaded.settings.model, "deepseek-v4-flash");
        assert!(dir.path().join("app-data.corrupt.json").exists());
    }

    #[test]
    fn legacy_app_data_without_events_loads_with_empty_event_log() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = LocalStore::new_for_tests(dir.path().to_path_buf());
        fs::create_dir_all(dir.path()).expect("create data dir");
        fs::write(
            store.data_file(),
            r#"{
              "profile": null,
              "state": null,
              "settings": {
                "baseUrl": "https://api.deepseek.com",
                "model": "deepseek-v4-flash",
                "temperature": 0.7
              },
              "memory": {
                "facts": [],
                "recentSummary": "",
                "updatedAt": "2026-05-30T00:00:00.000Z"
              }
            }"#,
        )
        .expect("write legacy data");

        let loaded = store.load_app_data().expect("load legacy data");

        assert_eq!(loaded.events.len(), 0);
    }

    #[test]
    fn legacy_pet_state_loads_with_lifecycle_defaults() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = LocalStore::new_for_tests(dir.path().to_path_buf());
        fs::create_dir_all(dir.path()).expect("create data dir");
        fs::write(
            store.data_file(),
            r#"{
              "profile": null,
              "state": {
                "mood": "calm",
                "hunger": 20,
                "energy": 80,
                "intimacy": 10,
                "action": "idle",
                "lastInteractionAt": "2026-05-30T00:00:00.000Z"
              },
              "settings": {
                "baseUrl": "https://api.deepseek.com",
                "model": "deepseek-v4-flash",
                "temperature": 0.7
              },
              "memory": {
                "facts": [],
                "recentSummary": "",
                "updatedAt": "2026-05-30T00:00:00.000Z"
              },
              "events": []
            }"#,
        )
        .expect("write legacy state data");

        let loaded = store.load_app_data().expect("load legacy state data");
        let state = loaded.state.expect("state");

        assert_eq!(state.cleanliness, 78);
        assert_eq!(state.health, 88);
        assert_eq!(state.boredom, 25);
        assert_eq!(state.trust, 10);
        assert_eq!(state.life_stage, "child");
        assert_eq!(state.sleep_state, "awake");
        assert_eq!(state.level, 1);
        assert_eq!(state.last_care_at, "2026-05-30T00:00:00.000Z");
    }

    #[test]
    fn legacy_profile_loads_with_default_avatar() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = LocalStore::new_for_tests(dir.path().to_path_buf());
        fs::create_dir_all(dir.path()).expect("create data dir");
        fs::write(
            store.data_file(),
            r##"{
              "profile": {
                "name": "桃桃",
                "species": "桌面小猫",
                "personaId": "healing",
                "createdAt": "2026-05-30T00:00:00.000Z"
              },
              "state": null,
              "settings": {
                "baseUrl": "https://api.deepseek.com",
                "model": "deepseek-v4-flash",
                "temperature": 0.7
              },
              "memory": {
                "facts": [],
                "recentSummary": "",
                "updatedAt": "2026-05-30T00:00:00.000Z"
              },
              "events": []
            }"##,
        )
        .expect("write legacy profile data");

        let loaded = store.load_app_data().expect("load legacy profile data");
        let avatar = loaded.profile.expect("profile").avatar;

        assert_eq!(avatar.body, "cat");
        assert_eq!(avatar.primary_color, "#f6c65b");
        assert_eq!(avatar.secondary_color, "#fff1bf");
        assert_eq!(avatar.eye_style, "dot");
        assert_eq!(avatar.mouth_style, "cat");
        assert_eq!(avatar.cheek_style, "pink");
        assert_eq!(avatar.accessory, "none");
    }

    #[test]
    fn old_built_in_provider_defaults_migrate_to_deepseek() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = LocalStore::new_for_tests(dir.path().to_path_buf());
        fs::create_dir_all(dir.path()).expect("create data dir");
        fs::write(
            store.data_file(),
            r#"{
              "profile": null,
              "state": null,
              "settings": {
                "baseUrl": "https://api.openai.com/v1",
                "model": "gpt-4.1-mini",
                "temperature": 0.7
              },
              "memory": {
                "facts": [],
                "recentSummary": "",
                "updatedAt": "2026-05-30T00:00:00.000Z"
              },
              "events": []
            }"#,
        )
        .expect("write legacy default settings");

        let loaded = store.load_app_data().expect("load migrated data");

        assert_eq!(loaded.settings.base_url, "https://api.deepseek.com");
        assert_eq!(loaded.settings.model, "deepseek-v4-flash");
    }
}
