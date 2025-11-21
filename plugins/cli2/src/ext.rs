use std::path::PathBuf;

pub trait CliPluginExt<R: tauri::Runtime> {
    fn handle_cli_matches(&self) -> Result<(), crate::Error>;
    fn get_cli_symlink_path(&self) -> PathBuf;
    fn get_cli_executable_path(&self) -> Result<PathBuf, crate::Error>;
    fn install_cli_to_path(&self) -> Result<(), crate::Error>;
    fn uninstall_cli_from_path(&self) -> Result<(), crate::Error>;
    fn check_cli_status(&self) -> Result<CliStatus, crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::CliPluginExt<R> for T {
    fn handle_cli_matches(&self) -> Result<(), crate::Error> {
        use tauri_plugin_cli::CliExt;

        match self.cli().matches() {
            Ok(matches) => {
                if matches.args.contains_key("help") || matches.args.contains_key("version") {
                    std::process::exit(0);
                }
            }
            Err(error) => {
                eprintln!("failed to read CLI matches: {error}");
                std::process::exit(1);
            }
        }

        Ok(())
    }

    fn get_cli_symlink_path(&self) -> PathBuf {
        #[cfg(unix)]
        {
            if let Some(home) = std::env::var_os("HOME") {
                return PathBuf::from(home).join(".local/bin/hyprnote");
            }
            PathBuf::from("/usr/local/bin/hyprnote")
        }

        #[cfg(windows)]
        {
            if let Some(home) = std::env::var_os("USERPROFILE") {
                return PathBuf::from(home).join(".local\\bin\\hyprnote.exe");
            }
            PathBuf::from("C:\\Program Files\\hyprnote\\hyprnote.exe")
        }

        #[cfg(not(any(unix, windows)))]
        {
            PathBuf::from("hyprnote")
        }
    }

    fn get_cli_executable_path(&self) -> Result<PathBuf, crate::Error> {
        std::env::current_exe().map_err(|e| e.into())
    }

    fn install_cli_to_path(&self) -> Result<(), crate::Error> {
        let exe_path = self.get_cli_executable_path()?;
        let symlink_path = self.get_cli_symlink_path();

        if let Some(parent) = symlink_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
            }
        }

        #[cfg(unix)]
        {
            if symlink_path.exists() {
                std::fs::remove_file(&symlink_path)?;
            }

            std::os::unix::fs::symlink(&exe_path, &symlink_path)?;
        }

        #[cfg(windows)]
        {
            if symlink_path.exists() {
                std::fs::remove_file(&symlink_path)?;
            }

            std::os::windows::fs::symlink_file(&exe_path, &symlink_path)?;
        }

        #[cfg(not(any(unix, windows)))]
        {
            return Err(crate::Error::UnsupportedPlatform);
        }

        Ok(())
    }

    fn uninstall_cli_from_path(&self) -> Result<(), crate::Error> {
        #[cfg(not(any(unix, windows)))]
        {
            return Err(crate::Error::UnsupportedPlatform);
        }

        let symlink_path = self.get_cli_symlink_path();

        let metadata = match std::fs::symlink_metadata(&symlink_path) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
            Err(error) => return Err(error.into()),
        };

        if metadata.file_type().is_symlink() {
            std::fs::remove_file(&symlink_path)?;
        } else {
            return Err(crate::Error::NonSymlinkCliPath(
                symlink_path.to_string_lossy().into_owned(),
            ));
        }

        Ok(())
    }

    fn check_cli_status(&self) -> Result<CliStatus, crate::Error> {
        let symlink_path = self.get_cli_symlink_path();

        if !symlink_path.exists() {
            return Ok(CliStatus {
                is_installed: false,
                symlink_path: None,
                target_path: None,
            });
        }

        let target = std::fs::read_link(&symlink_path).ok();

        Ok(CliStatus {
            is_installed: true,
            symlink_path: Some(symlink_path.to_string_lossy().to_string()),
            target_path: target.map(|p| p.to_string_lossy().to_string()),
        })
    }
}

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CliStatus {
    pub is_installed: bool,
    pub symlink_path: Option<String>,
    pub target_path: Option<String>,
}
