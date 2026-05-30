use serde::Serialize;
use tauri::{Emitter, State};

use crate::{
    ai::{self, ChatRequest, ChatResponse},
    app_state::BackendState,
    models::AppData,
    secret::{SecretError, SecretStore},
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppDataSnapshot {
    pub data: AppData,
    pub revision: u64,
}

#[tauri::command]
pub fn load_app_data(state: State<'_, BackendState>) -> Result<AppData, String> {
    let cache = state.cache.lock().map_err(|_| "state lock failed".to_string())?;
    Ok(cache.data.clone())
}

#[tauri::command]
pub fn load_app_data_snapshot(state: State<'_, BackendState>) -> Result<AppDataSnapshot, String> {
    let cache = state.cache.lock().map_err(|_| "state lock failed".to_string())?;
    Ok(AppDataSnapshot {
        data: cache.data.clone(),
        revision: cache.revision,
    })
}

#[tauri::command]
pub fn save_app_data(
    data: AppData,
    state: State<'_, BackendState>,
    app: tauri::AppHandle,
) -> Result<AppData, String> {
    let snapshot = {
        let mut cache = state.cache.lock().map_err(|_| "state lock failed".to_string())?;
        state
            .store
            .save_app_data(&data)
            .map_err(|error| error.to_string())?;
        cache.data = data.clone();
        cache.revision += 1;
        AppDataSnapshot {
            data: cache.data.clone(),
            revision: cache.revision,
        }
    };

    if let Err(error) = app.emit("app-data-updated", snapshot) {
        eprintln!("failed to emit app-data-updated: {error}");
    }

    Ok(data)
}

#[tauri::command]
pub fn save_app_data_if_current(
    data: AppData,
    expected_revision: u64,
    state: State<'_, BackendState>,
    app: tauri::AppHandle,
) -> Result<AppDataSnapshot, String> {
    let snapshot = {
        let mut cache = state.cache.lock().map_err(|_| "state lock failed".to_string())?;
        if cache.revision != expected_revision {
            return Err("app data changed".to_string());
        }
        state
            .store
            .save_app_data(&data)
            .map_err(|error| error.to_string())?;
        cache.data = data.clone();
        cache.revision += 1;
        AppDataSnapshot {
            data: cache.data.clone(),
            revision: cache.revision,
        }
    };

    if let Err(error) = app.emit("app-data-updated", snapshot.clone()) {
        eprintln!("failed to emit app-data-updated: {error}");
    }

    Ok(snapshot)
}

#[tauri::command]
pub fn save_api_key(provider_id: String, api_key: String) -> Result<String, String> {
    SecretStore::save_api_key(&provider_id, &api_key).map_err(|error| error.to_string())?;
    Ok(SecretStore::mask_api_key(&api_key))
}

#[tauri::command]
pub fn clear_api_key(provider_id: String) -> Result<(), String> {
    SecretStore::clear_api_key(&provider_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_api_key_status(provider_id: String) -> Result<Option<String>, String> {
    match SecretStore::read_api_key(&provider_id) {
        Ok(api_key) => Ok(Some(SecretStore::mask_api_key(&api_key))),
        Err(SecretError::Missing) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
pub async fn send_pet_chat(request: ChatRequest) -> Result<ChatResponse, String> {
    let api_key = read_optional_api_key(&request)?;
    ai::send_chat(request, api_key)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn test_provider_connection(
    request: ChatRequest,
    api_key: Option<String>,
) -> Result<String, String> {
    let api_key = match api_key.filter(|key| !key.trim().is_empty()) {
        Some(api_key) => api_key,
        None => read_optional_api_key(&request)?,
    };
    ai::send_chat(request, api_key)
        .await
        .map(|_| "连接成功".to_string())
        .map_err(|error| error.to_string())
}

fn read_optional_api_key(request: &ChatRequest) -> Result<String, String> {
    if request.auth == "none" {
        return Ok(String::new());
    }

    SecretStore::read_api_key(&request.provider_id).map_err(|error| error.to_string())
}
