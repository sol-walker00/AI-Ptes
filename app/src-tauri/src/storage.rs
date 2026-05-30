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
        match serde_json::from_str(&contents) {
            Ok(data) => Ok(data),
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

        assert_eq!(loaded.settings.model, "gpt-4.1-mini");
        assert_eq!(loaded.memory.facts.len(), 0);
    }

    #[test]
    fn corrupted_app_data_falls_back_to_default_and_is_backed_up() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = LocalStore::new_for_tests(dir.path().to_path_buf());
        fs::create_dir_all(dir.path()).expect("create data dir");
        fs::write(store.data_file(), "{not valid json").expect("write corrupted data");

        let loaded = store.load_app_data().expect("load default data");

        assert_eq!(loaded.settings.model, "gpt-4.1-mini");
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
                "baseUrl": "https://api.openai.com/v1",
                "model": "gpt-4.1-mini",
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
}
