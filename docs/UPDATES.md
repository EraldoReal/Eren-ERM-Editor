# Updates aus dem Programm (signiert)

Die Desktop-App prüft über **Hilfe → Nach Updates suchen…** den Feed
`https://erm.best-tools.app/downloads/latest.json`. Das Update wird mit dem in
`src-tauri/tauri.conf.json` (`plugins.updater.pubkey`) hinterlegten öffentlichen
Schlüssel geprüft. Ein manipuliertes Paket wird abgelehnt, bevor etwas installiert wird.

## Schlüssel

- Privater Schlüssel: `~/.tauri/erm-editor.key` (ohne Passwort erzeugt, **nie committen**, sichern!)
- Öffentlicher Schlüssel: steht in `tauri.conf.json`
- Geht der private Schlüssel verloren, können keine Updates mehr signiert werden. Dann
  müssen Nutzer die App einmal manuell neu installieren (neuer Schlüssel).

## Neue Version veröffentlichen

1. Version in `package.json`, `src-tauri/tauri.conf.json` und `src-tauri/Cargo.toml` erhöhen.
2. Bauen und signieren:
   ```bash
   export TAURI_SIGNING_PRIVATE_KEY=~/.tauri/erm-editor.key
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
   npx tauri build
   ```
   Ergebnis in `src-tauri/target/release/bundle/`:
   - macOS: `macos/ERM-Editor.app.tar.gz` und `macos/ERM-Editor.app.tar.gz.sig`
   - Windows: `nsis/ERM-Editor_<version>_x64-setup.exe` und `.exe.sig`
3. Die Pakete nach `https://erm.best-tools.app/downloads/` hochladen.
4. `latest.json` nach Vorlage unten schreiben. Der Wert `signature` ist der **Inhalt** der
   jeweiligen `.sig`-Datei. Die Datei zuletzt hochladen, denn erst damit sehen Nutzer das Update.

## Vorlage `latest.json`

```json
{
  "version": "1.0.1",
  "notes": "Kurze Beschreibung der Änderungen",
  "pub_date": "2026-11-21T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "<Inhalt von ERM-Editor.app.tar.gz.sig>",
      "url": "https://erm.best-tools.app/downloads/ERM-Editor_1.0.1_aarch64.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "<Inhalt der .sig für Intel-Mac>",
      "url": "https://erm.best-tools.app/downloads/ERM-Editor_1.0.1_x64.app.tar.gz"
    },
    "windows-x86_64": {
      "signature": "<Inhalt von ...-setup.exe.sig>",
      "url": "https://erm.best-tools.app/downloads/ERM-Editor_1.0.1_x64-setup.exe"
    }
  }
}
```

Es braucht nur die Plattformen, für die Sie Builds anbieten. Der Feed muss per **https**
ausgeliefert werden.

## Hinweise

- Alte Installationen (v1.0.0 mit eigenem Updater) lesen weiterhin `downloads/version.json`.
  Diese Datei können Sie behalten, bis alle auf die neue Version umgestiegen sind.
- Solange `latest.json` noch nicht existiert, zeigt der Update-Dialog "Update-Server konnte
  nicht erreicht werden". Das ist erwartet.
