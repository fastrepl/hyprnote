use tauri::AppHandle;
use tauri_plugin_cli::Matches;

pub fn entrypoint<R: tauri::Runtime>(app: &AppHandle<R>, matches: Matches) {
    let version = app.package_info().version.to_string();
    if let Some(subcommand_matches) = matches.subcommand {
        match subcommand_matches.name.as_str() {
            "bug" => url(
                app,
                format!("https://github.com/fastrepl/hyprnote/issues/new?labels=bug,v{version}"),
            ),
            "web" => url(app, "https://hyprnote.com"),
            "changelog" => url(app, "https://hyprnote.com/changelog"),
            _ => {
                tracing::warn!("unknown_subcommand: {}", subcommand_matches.name);
                std::process::exit(1);
            }
        }
    }
}

fn url<R: tauri::Runtime>(_app: &AppHandle<R>, url: impl Into<String>) {
    match open::that(url.into()) {
        Ok(_) => std::process::exit(0),
        Err(e) => {
            tracing::error!("open_url_error: {e}");
            std::process::exit(1);
        }
    }
}
