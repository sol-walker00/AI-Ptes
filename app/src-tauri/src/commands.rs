use tauri::State;

use crate::{
    ai::{self, ChatRequest, ChatResponse},
    app_state::BackendState,
    models::AppData,
    secret::{SecretError, SecretStore},
};

#[tauri::command]
pub fn load_app_data(state: State<'_, BackendState>) -> Result<AppData, String> {
    let cache = state.cache.lock().map_err(|_| "state lock failed".to_string())?;
    Ok(cache.clone())
}

#[tauri::command]
pub fn save_app_data(data: AppData, state: State<'_, BackendState>) -> Result<AppData, String> {
    state
        .store
        .save_app_data(&data)
        .map_err(|error| error.to_string())?;
    let mut cache = state.cache.lock().map_err(|_| "state lock failed".to_string())?;
    *cache = data.clone();
    Ok(data)
}

#[tauri::command]
pub fn save_api_key(api_key: String) -> Result<String, String> {
    SecretStore::save_api_key(&api_key).map_err(|error| error.to_string())?;
    Ok(SecretStore::mask_api_key(&api_key))
}

#[tauri::command]
pub fn clear_api_key() -> Result<(), String> {
    SecretStore::clear_api_key().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_api_key_status() -> Result<Option<String>, String> {
    match SecretStore::read_api_key() {
        Ok(api_key) => Ok(Some(SecretStore::mask_api_key(&api_key))),
        Err(SecretError::Missing) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
pub async fn send_pet_chat(request: ChatRequest) -> Result<ChatResponse, String> {
    let api_key = SecretStore::read_api_key().map_err(|error| error.to_string())?;
    ai::send_chat(request, api_key)
        .await
        .map_err(|error| error.to_string())
}
