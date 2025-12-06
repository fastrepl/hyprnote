use std::io::{Cursor, Read, Write};
use std::path::PathBuf;

use sha2::{Digest, Sha256};
use tauri::Manager;

use crate::{Error, ExtensionInfo, ExtensionsPluginExt, PanelInfo, RegistryResponse};

#[tauri::command]
#[specta::specta]
pub async fn load_extension<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    path: String,
) -> Result<(), Error> {
    app.load_extension(PathBuf::from(path)).await
}

#[tauri::command]
#[specta::specta]
pub async fn call_function<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    extension_id: String,
    function_name: String,
    args_json: String,
) -> Result<String, Error> {
    app.call_function(extension_id, function_name, args_json)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn execute_code<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    extension_id: String,
    code: String,
) -> Result<String, Error> {
    app.execute_code(extension_id, code).await
}

#[tauri::command]
#[specta::specta]
pub async fn list_extensions<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<ExtensionInfo>, Error> {
    let extensions_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| Error::Io(e.to_string()))?
        .join("extensions");

    let extensions = hypr_extensions_runtime::discover_extensions(&extensions_dir);

    Ok(extensions
        .into_iter()
        .map(|ext| {
            let panels = ext
                .panels()
                .iter()
                .map(|p| PanelInfo {
                    id: p.id.clone(),
                    title: p.title.clone(),
                    entry: p.entry.clone(),
                    entry_path: ext
                        .panel_path(&p.id)
                        .map(|p| p.to_string_lossy().to_string()),
                    styles_path: ext
                        .panel_styles_path(&p.id)
                        .map(|p| p.to_string_lossy().to_string()),
                })
                .collect();
            ExtensionInfo {
                id: ext.manifest.id.clone(),
                name: ext.manifest.name.clone(),
                version: ext.manifest.version.clone(),
                api_version: ext.manifest.api_version.clone(),
                description: ext.manifest.description.clone(),
                path: ext.path.to_string_lossy().to_string(),
                panels,
            }
        })
        .collect())
}

#[tauri::command]
#[specta::specta]
pub async fn get_extensions_dir<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, Error> {
    let extensions_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| Error::Io(e.to_string()))?
        .join("extensions");

    if !extensions_dir.exists() {
        std::fs::create_dir_all(&extensions_dir).map_err(|e| Error::Io(e.to_string()))?;
    }

    Ok(extensions_dir.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_extension<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    extension_id: String,
) -> Result<ExtensionInfo, Error> {
    let extensions_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| Error::Io(e.to_string()))?
        .join("extensions");

    let extensions = hypr_extensions_runtime::discover_extensions(&extensions_dir);

    extensions
        .into_iter()
        .find(|ext| ext.manifest.id == extension_id)
        .map(|ext| {
            let panels = ext
                .panels()
                .iter()
                .map(|p| PanelInfo {
                    id: p.id.clone(),
                    title: p.title.clone(),
                    entry: p.entry.clone(),
                    entry_path: ext
                        .panel_path(&p.id)
                        .map(|p| p.to_string_lossy().to_string()),
                    styles_path: ext
                        .panel_styles_path(&p.id)
                        .map(|p| p.to_string_lossy().to_string()),
                })
                .collect();
            ExtensionInfo {
                id: ext.manifest.id.clone(),
                name: ext.manifest.name.clone(),
                version: ext.manifest.version.clone(),
                api_version: ext.manifest.api_version.clone(),
                description: ext.manifest.description.clone(),
                path: ext.path.to_string_lossy().to_string(),
                panels,
            }
        })
        .ok_or(Error::ExtensionNotFound(extension_id))
}

const REGISTRY_URL: &str = "https://pub-hyprnote.r2.dev/extensions/registry.json";

#[tauri::command]
#[specta::specta]
pub async fn fetch_registry() -> Result<RegistryResponse, Error> {
    let response = reqwest::get(REGISTRY_URL)
        .await
        .map_err(|e| Error::Network(e.to_string()))?;

    let registry: RegistryResponse = response
        .json()
        .await
        .map_err(|e| Error::Network(e.to_string()))?;

    Ok(registry)
}

#[tauri::command]
#[specta::specta]
pub async fn download_extension<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    extension_id: String,
    download_url: String,
    expected_checksum: String,
) -> Result<(), Error> {
    let extensions_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| Error::Io(e.to_string()))?
        .join("extensions");

    if !extensions_dir.exists() {
        std::fs::create_dir_all(&extensions_dir).map_err(|e| Error::Io(e.to_string()))?;
    }

    let response = reqwest::get(&download_url)
        .await
        .map_err(|e| Error::Network(e.to_string()))?;

    let bytes = response
        .bytes()
        .await
        .map_err(|e| Error::Network(e.to_string()))?;

    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let actual_checksum = hex::encode(hasher.finalize());

    if actual_checksum != expected_checksum {
        return Err(Error::ChecksumMismatch {
            expected: expected_checksum,
            actual: actual_checksum,
        });
    }

    let cursor = Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| Error::ZipError(e.to_string()))?;

    let target_dir = extensions_dir.join(&extension_id);
    if target_dir.exists() {
        std::fs::remove_dir_all(&target_dir).map_err(|e| Error::Io(e.to_string()))?;
    }
    std::fs::create_dir_all(&target_dir).map_err(|e| Error::Io(e.to_string()))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| Error::ZipError(e.to_string()))?;

        let outpath = match file.enclosed_name() {
            Some(path) => {
                let components: Vec<_> = path.components().collect();
                if components.len() > 1 {
                    target_dir.join(components[1..].iter().collect::<PathBuf>())
                } else {
                    continue;
                }
            }
            None => continue,
        };

        if file.is_dir() {
            std::fs::create_dir_all(&outpath).map_err(|e| Error::Io(e.to_string()))?;
        } else {
            if let Some(parent) = outpath.parent() {
                if !parent.exists() {
                    std::fs::create_dir_all(parent).map_err(|e| Error::Io(e.to_string()))?;
                }
            }
            let mut outfile =
                std::fs::File::create(&outpath).map_err(|e| Error::Io(e.to_string()))?;
            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer)
                .map_err(|e| Error::Io(e.to_string()))?;
            outfile
                .write_all(&buffer)
                .map_err(|e| Error::Io(e.to_string()))?;
        }
    }

    tracing::info!("Installed extension: {}", extension_id);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn uninstall_extension<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    extension_id: String,
) -> Result<(), Error> {
    let extensions_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| Error::Io(e.to_string()))?
        .join("extensions");

    let extension_dir = extensions_dir.join(&extension_id);

    if !extension_dir.exists() {
        return Err(Error::ExtensionNotFound(extension_id));
    }

    std::fs::remove_dir_all(&extension_dir).map_err(|e| Error::Io(e.to_string()))?;

    tracing::info!("Uninstalled extension: {}", extension_id);
    Ok(())
}
