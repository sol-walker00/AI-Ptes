use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle,
};

use crate::windows;

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_pet = MenuItem::with_id(app, "show_pet", "显示宠物", true, None::<&str>)?;
    let hide_pet = MenuItem::with_id(app, "hide_pet", "隐藏宠物", true, None::<&str>)?;
    let open_settings = MenuItem::with_id(app, "open_settings", "设置", true, None::<&str>)?;
    let open_chat = MenuItem::with_id(app, "open_chat", "深度聊天", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_pet, &hide_pet, &open_settings, &open_chat, &quit])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show_pet" => windows::show_window(app, "pet"),
            "hide_pet" => windows::hide_window(app, "pet"),
            "open_settings" => windows::show_window(app, "settings"),
            "open_chat" => windows::show_window(app, "chat"),
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}
