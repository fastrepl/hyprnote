use tauri::AppHandle;
use tauri_plugin_cli::Matches;
use tauri_plugin_opener::OpenerExt;

pub fn entrypoint<R: tauri::Runtime>(app: &AppHandle<R>, matches: Matches) {
    if matches.args.contains_key("help") {
        std::process::exit(0);
    }

    if matches.args.contains_key("version") {
        std::process::exit(0);
    }

    if let Some(subcommand_matches) = matches.subcommand {
        match subcommand_matches.name.as_str() {
            "hello" => hello(app),
            _ => {
                tracing::warn!("unknown_subcommand: {}", subcommand_matches.name);
                std::process::exit(1);
            }
        }
    }
}

fn hello<R: tauri::Runtime>(app: &AppHandle<R>) {
    if let Err(e) = app.opener().open_url("https://hyprnote.com", None::<&str>) {
        tracing::error!("failed_to_open_url: {}", e);
    }

    std::process::exit(0);
}
