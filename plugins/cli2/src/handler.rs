use serde_json::Value;
use tauri::AppHandle;
use tauri_plugin_cli::Matches;
use tauri_plugin_updater::UpdaterExt;

pub fn handle_cli_args<R: tauri::Runtime>(app: &AppHandle<R>, argv: Vec<String>) -> bool {
    if argv.len() <= 1 {
        return true;
    }

    let args: Vec<&str> = argv.iter().skip(1).map(|s| s.as_str()).collect();

    if args.is_empty() {
        return true;
    }

    let first_arg = args[0];

    if first_arg == "--help" || first_arg == "-h" {
        return false;
    }

    if first_arg == "--version" || first_arg == "-V" {
        return false;
    }

    let version = app.package_info().version.to_string();
    match first_arg {
        "bug" => {
            url(
                app,
                format!("https://github.com/fastrepl/hyprnote/issues/new?labels=bug,v{version}"),
            );
            false
        }
        "web" => {
            url(app, "https://hyprnote.com");
            false
        }
        "changelog" => {
            url(app, "https://hyprnote.com/changelog");
            false
        }
        "update" => false,
        _ => true,
    }
}

pub fn entrypoint<R: tauri::Runtime>(app: &AppHandle<R>, matches: Matches) {
    if let Some(arg) = matches.args.get("help") {
        if let Value::String(help_text) = &arg.value {
            print!("{help_text}");
        }
        std::process::exit(0);
    }

    if matches.args.contains_key("version") {
        let name = &app.package_info().name;
        let version = &app.package_info().version;
        println!("{name} {version}");
        std::process::exit(0);
    }

    let version = app.package_info().version.to_string();
    if let Some(subcommand_matches) = matches.subcommand {
        match subcommand_matches.name.as_str() {
            "bug" => url(
                app,
                format!("https://github.com/fastrepl/hyprnote/issues/new?labels=bug,v{version}"),
            ),
            "web" => url(app, "https://hyprnote.com"),
            "changelog" => url(app, "https://hyprnote.com/changelog"),
            "update" => update(app),
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

fn update<R: tauri::Runtime>(app: &AppHandle<R>) {
    let app_clone = app.clone();
    tauri::async_runtime::block_on(async move {
        let updater = match app_clone.updater() {
            Ok(updater) => updater,
            Err(e) => {
                eprintln!("Failed to initialize updater: {e}");
                std::process::exit(1);
            }
        };

        println!("Checking for updates...");

        match updater.check().await {
            Ok(Some(update)) => {
                println!("Update available: v{}", update.version);
                if let Some(body) = &update.body {
                    println!("\nRelease notes:\n{body}");
                }

                println!("\nDownloading update...");
                match update.download_and_install(|_, _| {}, || {}).await {
                    Ok(_) => {
                        println!("Update installed successfully. Please restart the application.");
                        std::process::exit(0);
                    }
                    Err(e) => {
                        eprintln!("Failed to install update: {e}");
                        std::process::exit(1);
                    }
                }
            }
            Ok(None) => {
                println!("Already up to date.");
                std::process::exit(0);
            }
            Err(e) => {
                eprintln!("Failed to check for updates: {e}");
                std::process::exit(1);
            }
        }
    });
}
