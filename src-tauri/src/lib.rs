use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager};

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

fn parse_semver(v: &str) -> (u32, u32, u32) {
    let cleaned = v.trim().trim_start_matches('v');
    let mut parts = cleaned.split('.').map(|s| s.parse::<u32>().unwrap_or(0));
    (
        parts.next().unwrap_or(0),
        parts.next().unwrap_or(0),
        parts.next().unwrap_or(0),
    )
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

const MANIFEST_URL: &str = "https://erm.best-tools.app/downloads/version.json";
const ALLOWED_DOWNLOAD_PREFIX: &str = "https://erm.best-tools.app/";

/// Fetches a URL over HTTPS only (no redirects to other protocols) via curl.
fn curl_https(url: &str, output_file: Option<&Path>, max_time: &str) -> Result<Vec<u8>, String> {
    let mut cmd = Command::new("curl");
    cmd.args([
        "-fsSL",
        "--proto",
        "=https",
        "--proto-redir",
        "=https",
        "--tlsv1.2",
        "--max-time",
        max_time,
    ]);
    if let Some(path) = output_file {
        cmd.arg("-o").arg(path);
    }
    let output = cmd
        .arg(url)
        .output()
        .map_err(|e| format!("Download fehlgeschlagen: {e}"))?;
    if !output.status.success() {
        return Err("Server konnte nicht erreicht werden.".to_string());
    }
    Ok(output.stdout)
}

fn fetch_manifest() -> Result<serde_json::Value, String> {
    let body = curl_https(MANIFEST_URL, None, "10")
        .map_err(|e| format!("Fehler beim Abrufen der Update-Informationen: {e}"))?;
    serde_json::from_slice(&body).map_err(|e| format!("Ungültiges Update-Manifest: {e}"))
}

/// Download URL and expected SHA-256 for the current platform from the manifest.
fn platform_asset(json: &serde_json::Value) -> (String, String) {
    #[cfg(target_os = "macos")]
    let (url_key, sha_key) = ("macUrl", "macSha256");
    #[cfg(target_os = "windows")]
    let (url_key, sha_key) = ("winUrl", "winSha256");
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let (url_key, sha_key) = ("linuxUrl", "linuxSha256");

    (
        json[url_key].as_str().unwrap_or("").to_string(),
        json[sha_key].as_str().unwrap_or("").trim().to_lowercase(),
    )
}

#[tauri::command]
fn check_app_update(app: tauri::AppHandle) -> Result<UpdateCheckResult, String> {
    let current_version = app.package_info().version.to_string();
    let json = fetch_manifest()?;

    let latest_version = json["version"]
        .as_str()
        .unwrap_or(&current_version)
        .to_string();
    let notes = json["notes"].as_str().unwrap_or("").to_string();
    let (download_url, _) = platform_asset(&json);

    let available = parse_semver(&latest_version) > parse_semver(&current_version);

    Ok(UpdateCheckResult {
        current_version,
        latest_version,
        available,
        download_url,
        notes,
    })
}

/// Creates a fresh, private (0700) temp directory that only this process uses.
#[cfg(any(target_os = "macos", target_os = "windows"))]
fn make_private_temp_dir() -> Result<PathBuf, String> {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let dir = std::env::temp_dir().join(format!("erm-editor-update-{}-{nanos}", std::process::id()));
    let mut builder = std::fs::DirBuilder::new();
    #[cfg(unix)]
    {
        use std::os::unix::fs::DirBuilderExt;
        builder.mode(0o700);
    }
    builder
        .create(&dir)
        .map_err(|e| format!("Temporärer Ordner konnte nicht erstellt werden: {e}"))?;
    Ok(dir)
}

#[cfg(any(target_os = "macos", target_os = "windows"))]
fn sha256_hex_of_file(path: &Path) -> Result<String, String> {
    use sha2::{Digest, Sha256};
    use std::io::Read;
    let mut file = std::fs::File::open(path)
        .map_err(|e| format!("Heruntergeladene Datei konnte nicht gelesen werden: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = file
            .read(&mut buf)
            .map_err(|e| format!("Heruntergeladene Datei konnte nicht gelesen werden: {e}"))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(hasher
        .finalize()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect())
}

/// Downloads the platform asset announced by the manifest and verifies its SHA-256.
/// The manifest is fetched again here instead of trusting a URL sent by the webview.
#[cfg(any(target_os = "macos", target_os = "windows"))]
fn download_verified(dir: &Path, file_name: &str) -> Result<PathBuf, String> {
    let json = fetch_manifest()?;
    let (url, expected_sha) = platform_asset(&json);

    if url.is_empty() {
        return Err("Kein Download-Link für diese Plattform hinterlegt.".to_string());
    }
    if !url.starts_with(ALLOWED_DOWNLOAD_PREFIX) {
        return Err("Der Download-Link des Update-Manifests ist nicht vertrauenswürdig.".to_string());
    }
    if expected_sha.len() != 64 || !expected_sha.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("Das Update-Manifest enthält keine gültige SHA-256-Prüfsumme.".to_string());
    }

    let target = dir.join(file_name);
    curl_https(&url, Some(&target), "600")
        .map_err(|_| "Update-Paket konnte nicht heruntergeladen werden.".to_string())?;

    let actual = sha256_hex_of_file(&target)?;
    if actual != expected_sha {
        return Err("Prüfsumme des Updates stimmt nicht überein. Installation abgebrochen.".to_string());
    }
    Ok(target)
}

#[cfg(target_os = "macos")]
fn install_macos_update(work_dir: &Path) -> Result<(), String> {
    let dmg = download_verified(work_dir, "update.dmg")?;
    let mount_point = work_dir.join("mount");
    std::fs::create_dir(&mount_point)
        .map_err(|e| format!("Mount-Ordner konnte nicht erstellt werden: {e}"))?;

    let attach = Command::new("hdiutil")
        .arg("attach")
        .arg(&dmg)
        .arg("-mountpoint")
        .arg(&mount_point)
        .args(["-nobrowse", "-readonly", "-quiet"])
        .status()
        .map_err(|e| format!("Mounten fehlgeschlagen: {e}"))?;
    if !attach.success() {
        return Err("DMG-Image konnte nicht geöffnet werden.".to_string());
    }

    let result = (|| -> Result<(), String> {
        let src_app = mount_point.join("ERM-Editor.app");
        if !src_app.is_dir() {
            return Err("Das Update-Paket enthält keine ERM-Editor.app.".to_string());
        }

        let verified = Command::new("codesign")
            .args(["--verify", "--deep", "--strict"])
            .arg(&src_app)
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        if !verified {
            return Err("Die Code-Signatur der neuen App ist ungültig.".to_string());
        }

        let dst_app = Path::new("/Applications/ERM-Editor.app");
        let staging = Path::new("/Applications/.ERM-Editor-update.app");
        let backup = Path::new("/Applications/.ERM-Editor-backup.app");
        let _ = std::fs::remove_dir_all(staging);
        let _ = std::fs::remove_dir_all(backup);

        // 1. Copy the new app next to the old one; the old app stays untouched on failure.
        let copy = Command::new("cp")
            .arg("-R")
            .arg(&src_app)
            .arg(staging)
            .status()
            .map_err(|e| format!("Kopieren fehlgeschlagen: {e}"))?;
        if !copy.success() {
            let _ = std::fs::remove_dir_all(staging);
            return Err("App konnte nicht nach /Applications kopiert werden.".to_string());
        }

        // 2. Swap: old -> backup, new -> final location. Roll back if the swap fails.
        let had_old = dst_app.exists();
        if had_old {
            if let Err(e) = std::fs::rename(dst_app, backup) {
                let _ = std::fs::remove_dir_all(staging);
                return Err(format!("Die alte App konnte nicht ersetzt werden: {e}"));
            }
        }
        if let Err(e) = std::fs::rename(staging, dst_app) {
            if had_old {
                let _ = std::fs::rename(backup, dst_app);
            }
            let _ = std::fs::remove_dir_all(staging);
            return Err(format!("Die neue App konnte nicht installiert werden: {e}"));
        }
        let _ = std::fs::remove_dir_all(backup);
        Ok(())
    })();

    let _ = Command::new("hdiutil")
        .arg("detach")
        .arg(&mount_point)
        .arg("-quiet")
        .status();
    result
}

#[tauri::command]
fn install_app_update() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let work_dir = make_private_temp_dir()?;
        let result = install_macos_update(&work_dir);
        let _ = std::fs::remove_dir_all(&work_dir);
        result?;
        let _ = Command::new("open")
            .args(["-n", "/Applications/ERM-Editor.app"])
            .spawn();
        std::process::exit(0);
    }

    #[cfg(target_os = "windows")]
    {
        let work_dir = make_private_temp_dir()?;
        let installer = download_verified(&work_dir, "ERM-Editor-Update.exe").inspect_err(|_| {
            let _ = std::fs::remove_dir_all(&work_dir);
        })?;
        Command::new(&installer)
            .spawn()
            .map_err(|e| format!("Installer konnte nicht gestartet werden: {e}"))?;
        std::process::exit(0);
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Ok("Bitte lade die aktuelle Version über Hilfe -> Download herunter.".to_string())
    }
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
