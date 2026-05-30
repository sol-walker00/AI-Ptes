mod ai;
mod app_state;
mod commands;
mod models;
mod secret;
mod storage;
mod tray;
mod windows;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let backend_state = app_state::BackendState::load().expect("load backend state");

    tauri::Builder::default()
        .manage(backend_state)
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            tray::setup_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_app_data,
            commands::save_app_data,
            commands::save_api_key,
            commands::clear_api_key,
            commands::get_api_key_status,
            commands::send_pet_chat
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
