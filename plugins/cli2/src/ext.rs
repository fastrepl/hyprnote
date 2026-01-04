use std::path::PathBuf;

pub struct Cli2<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Cli2<'a, R, M> {
    pub fn get_cli_binary_name(&self) -> String {
        if let Ok(exe_path) = std::env::current_exe()
            && let Some(file_name) = exe_path.file_stem()
        {
            return file_name.to_string_lossy().to_string();
        }
        "hyprnote".to_string()
    }

    pub fn get_cli_symlink_path(&self) -> PathBuf {
        let binary_name = self.get_cli_binary_name();

        #[cfg(unix)]
        {
            if let Some(home) = std::env::var_os("HOME") {
                return PathBuf::from(home).join(".local/bin").join(&binary_name);
            }
            PathBuf::from("/usr/local/bin").join(&binary_name)
        }

        #[cfg(windows)]
        {
            let binary_name_exe = format!("{}.exe", binary_name);
            if let Some(home) = std::env::var_os("USERPROFILE") {
                return PathBuf::from(home)
                    .join(".local\\bin")
                    .join(&binary_name_exe);
            }
            PathBuf::from("C:\\Program Files\\hyprnote").join(&binary_name_exe)
        }

        #[cfg(not(any(unix, windows)))]
        {
            PathBuf::from(&binary_name)
        }
    }

    pub fn get_cli_executable_path(&self) -> Result<PathBuf, crate::Error> {
        std::env::current_exe().map_err(|e| e.into())
    }

    pub fn is_cli_path_in_env_path(&self) -> bool {
        let symlink_path = self.get_cli_symlink_path();
        if let Some(parent) = symlink_path.parent()
            && let Some(env_path) = std::env::var_os("PATH")
        {
            let paths: Vec<PathBuf> = std::env::split_paths(&env_path).collect();
            return paths.iter().any(|p| p == parent);
        }
        false
    }

    pub fn install_cli_to_path(&self) -> Result<(), crate::Error> {
        let exe_path = self.get_cli_executable_path()?;
        let symlink_path = self.get_cli_symlink_path();

        if let Some(parent) = symlink_path.parent()
            && !parent.exists()
        {
            std::fs::create_dir_all(parent)?;
        }

        #[cfg(unix)]
        {
            if std::fs::symlink_metadata(&symlink_path).is_ok() {
                std::fs::remove_file(&symlink_path)?;
            }

            std::os::unix::fs::symlink(&exe_path, &symlink_path)?;
        }

        #[cfg(windows)]
        {
            if std::fs::symlink_metadata(&symlink_path).is_ok() {
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

    pub fn uninstall_cli_from_path(&self) -> Result<(), crate::Error> {
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

    pub fn check_cli_status(&self) -> Result<CliStatus, crate::Error> {
        let symlink_path = self.get_cli_symlink_path();
        let binary_name = self.get_cli_binary_name();
        let is_in_path = self.is_cli_path_in_env_path();

        match std::fs::symlink_metadata(&symlink_path) {
            Ok(metadata) if metadata.file_type().is_symlink() => {
                let target = std::fs::read_link(&symlink_path).ok();
                Ok(CliStatus {
                    is_installed: true,
                    symlink_path: Some(symlink_path.to_string_lossy().to_string()),
                    target_path: target.map(|p| p.to_string_lossy().to_string()),
                    binary_name,
                    is_in_path,
                })
            }
            Ok(_) => Ok(CliStatus {
                is_installed: false,
                symlink_path: None,
                target_path: None,
                binary_name,
                is_in_path,
            }),
            Err(_) => Ok(CliStatus {
                is_installed: false,
                symlink_path: None,
                target_path: None,
                binary_name,
                is_in_path,
            }),
        }
    }
}

pub trait Cli2PluginExt<R: tauri::Runtime> {
    fn cli2(&self) -> Cli2<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> Cli2PluginExt<R> for T {
    fn cli2(&self) -> Cli2<'_, R, Self>
    where
        Self: Sized,
    {
        Cli2 {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CliStatus {
    pub is_installed: bool,
    pub symlink_path: Option<String>,
    pub target_path: Option<String>,
    pub binary_name: String,
    pub is_in_path: bool,
}
