#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// OPENTCS desktop shell (Tauri v2).
// The heavy lifting (chat UI, calling the AI provider APIs, local storage of
// API keys) all happens in the webview (dist/index.html + app.js). The
// window itself just needs to be able to reach external HTTPS APIs, which
// is governed by the CSP in tauri.conf.json plus the capability file.

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running OPENTCS");
}
