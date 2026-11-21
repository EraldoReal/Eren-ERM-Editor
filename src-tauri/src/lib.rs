use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;

#[cfg(target_os = "macos")]
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};

static FORCE_CLOSE: AtomicBool = AtomicBool::new(false);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub current_version: String,
    pub latest_version: String,
    pub available: bool,
    pub download_url: String,
    pub notes: String,
}

#[tauri::command]
fn confirm_close(app: tauri::AppHandle) {
    FORCE_CLOSE.store(true, Ordering::SeqCst);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.close();
    } else {
        app.exit(0);
    }
}

/// Checks the signed update feed configured in `tauri.conf.json` (plugins.updater).
/// The updater plugin verifies the download against the embedded public key, so a
/// tampered feed or payload is rejected before anything is installed.
#[tauri::command]
async fn check_app_update(app: tauri::AppHandle) -> Result<UpdateCheckResult, String> {
    let current_version = app.package_info().version.to_string();
    let update = app
        .updater()
        .map_err(|e| format!("Updater konnte nicht gestartet werden: {e}"))?
        .check()
        .await
        .map_err(|e| format!("Update-Server konnte nicht erreicht werden: {e}"))?;

    Ok(match update {
        Some(u) => UpdateCheckResult {
            current_version,
            latest_version: u.version.clone(),
            available: true,
            download_url: u.download_url.to_string(),
            notes: u.body.clone().unwrap_or_default(),
        },
        None => UpdateCheckResult {
            latest_version: current_version.clone(),
            current_version,
            available: false,
            download_url: String::new(),
            notes: String::new(),
        },
    })
}

/// Downloads, signature-checks and installs the update, then restarts the app.
#[tauri::command]
async fn install_app_update(app: tauri::AppHandle) -> Result<String, String> {
    let update = app
        .updater()
        .map_err(|e| format!("Updater konnte nicht gestartet werden: {e}"))?
        .check()
        .await
        .map_err(|e| format!("Update-Server konnte nicht erreicht werden: {e}"))?
        .ok_or_else(|| "Es ist kein Update verfügbar.".to_string())?;

    update
        .download_and_install(|_chunk, _total| {}, || {})
        .await
        .map_err(|e| format!("Update konnte nicht installiert werden: {e}"))?;

    app.restart()
}

#[cfg(target_os = "macos")]
fn build_macos_menu(app: &tauri::AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    let app_menu = SubmenuBuilder::new(app, "ERM-Editor")
        .item(&MenuItemBuilder::with_id("app-about", "Über ERM-Editor…").build(app)?)
        .item(&MenuItemBuilder::with_id("app-update", "Nach Updates suchen…").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("options-settings", "Einstellungen…").accelerator("CmdOrCtrl+,").build(app)?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, Some("Ausblenden"))?)
        .item(&PredefinedMenuItem::hide_others(app, Some("Andere ausblenden"))?)
        .item(&PredefinedMenuItem::show_all(app, Some("Alle einblenden"))?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, Some("Beenden"))?)
        .build()?;

    let file_menu = SubmenuBuilder::new(app, "Datei")
        .item(&MenuItemBuilder::with_id("file-new", "Neues Diagramm").accelerator("CmdOrCtrl+N").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("file-open", "Öffnen…").accelerator("CmdOrCtrl+O").build(app)?)
        .item(&MenuItemBuilder::with_id("file-save", "Speichern").accelerator("CmdOrCtrl+S").build(app)?)
        .item(&MenuItemBuilder::with_id("file-save-as", "Speichern unter…").accelerator("CmdOrCtrl+Shift+S").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("file-export-sql", "SQL-DDL exportieren…").build(app)?)
        .item(&MenuItemBuilder::with_id("file-print", "Drucken…").accelerator("CmdOrCtrl+P").build(app)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Bearbeiten")
        .item(&MenuItemBuilder::with_id("edit-undo", "Rückgängig").accelerator("CmdOrCtrl+Z").build(app)?)
        .item(&MenuItemBuilder::with_id("edit-redo", "Wiederholen").accelerator("CmdOrCtrl+Shift+Z").build(app)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, Some("Ausschneiden"))?)
        .item(&PredefinedMenuItem::copy(app, Some("Kopieren"))?)
        .item(&PredefinedMenuItem::paste(app, Some("Einfügen"))?)
        .item(&PredefinedMenuItem::select_all(app, Some("Alles auswählen"))?)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "Ansicht")
        .item(&MenuItemBuilder::with_id("view-zoom-in", "Arbeitsfläche vergrößern").accelerator("CmdOrCtrl+=").build(app)?)
        .item(&MenuItemBuilder::with_id("view-zoom-out", "Arbeitsfläche verkleinern").accelerator("CmdOrCtrl+-").build(app)?)
        .item(&MenuItemBuilder::with_id("view-reset", "Ansicht zurücksetzen").accelerator("CmdOrCtrl+0").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("view-ui-up", "Programmoberfläche vergrößern").build(app)?)
        .item(&MenuItemBuilder::with_id("view-ui-down", "Programmoberfläche verkleinern").build(app)?)
        .item(&MenuItemBuilder::with_id("view-ui-reset", "Programmoberfläche 100%").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("view-auto-layout", "Automatisch anordnen").build(app)?)
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Hilfe")
        .item(&MenuItemBuilder::with_id("help-shortcuts", "Schnellhilfe & Tastenkürzel").build(app)?)
        .item(&MenuItemBuilder::with_id("help-download", "Download (macOS / Windows)").build(app)?)
        .item(&MenuItemBuilder::with_id("help-update", "Nach Updates suchen…").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("help-about", "Über ERM-Editor / Impressum").build(app)?)
        .build()?;

    MenuBuilder::new(app)
        .items(&[&app_menu, &file_menu, &edit_menu, &view_menu, &help_menu])
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                if let Ok(menu) = build_macos_menu(app.handle()) {
                    let _ = app.set_menu(menu);
                }
            }
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(not(target_os = "macos"))]
                {
                    let _ = window.remove_menu();
                }
                let win_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        if !FORCE_CLOSE.load(Ordering::SeqCst) {
                            api.prevent_close();
                            let _ = win_clone.emit("app-close-requested", ());
                        }
                    }
                });
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            let _ = app.emit("menu-action", event.id().0.clone());
        })
        .invoke_handler(tauri::generate_handler![
            confirm_close,
            check_app_update,
            install_app_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
