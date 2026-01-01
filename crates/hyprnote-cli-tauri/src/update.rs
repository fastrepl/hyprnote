use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

pub async fn run<R: tauri::Runtime>(app: &AppHandle<R>) -> i32 {
    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(e) => {
            eprintln!("Failed to initialize updater: {e}");
            return 1;
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
                    0
                }
                Err(e) => {
                    eprintln!("Failed to install update: {e}");
                    1
                }
            }
        }
        Ok(None) => {
            println!("Already up to date.");
            0
        }
        Err(e) => {
            eprintln!("Failed to check for updates: {e}");
            1
        }
    }
}
