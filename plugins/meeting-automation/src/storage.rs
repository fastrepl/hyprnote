use crate::config::AutomationConfig;
use crate::Result;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};
use tracing::{debug, info};

const CONFIG_FILE_NAME: &str = "meeting-automation-config.json";


pub struct ConfigStorage<R: Runtime> {
    app_handle: AppHandle<R>,
    config_path: PathBuf,
}

impl<R: Runtime> Clone for ConfigStorage<R> {
    fn clone(&self) -> Self {
        Self {
            app_handle: self.app_handle.clone(),
            config_path: self.config_path.clone(),
        }
    }
}

impl<R: Runtime> ConfigStorage<R> {
    pub fn new(app_handle: AppHandle<R>) -> Result<Self> {
        let app_data_dir = app_handle.path().app_data_dir().map_err(|e| {
            crate::Error::ConfigurationError(format!("Failed to get app data dir: {}", e))
        })?;

        let config_path = app_data_dir.join(CONFIG_FILE_NAME);

        std::fs::create_dir_all(&app_data_dir).map_err(|e| {
            crate::Error::ConfigurationError(format!("Failed to create config directory: {}", e))
        })?;

        Ok(Self {
            app_handle,
            config_path,
        })
    }

    pub fn load_config(&self) -> Result<AutomationConfig> {
        if !self.config_path.exists() {
            debug!("Config file doesn't exist, returning default configuration");
            return Ok(AutomationConfig::default());
        }

        let config_content = std::fs::read_to_string(&self.config_path).map_err(|e| {
            crate::Error::ConfigurationError(format!("Failed to read config file: {}", e))
        })?;

        let config: AutomationConfig = serde_json::from_str(&config_content).map_err(|e| {
            crate::Error::ConfigurationError(format!("Failed to parse config file: {}", e))
        })?;

        info!(
            "Loaded meeting automation config from {}",
            self.config_path.display()
        );
        Ok(config)
    }

    pub fn save_config(&self, config: &AutomationConfig) -> Result<()> {
        let config_content = serde_json::to_string_pretty(config).map_err(|e| {
            crate::Error::ConfigurationError(format!("Failed to serialize config: {}", e))
        })?;

        std::fs::write(&self.config_path, config_content).map_err(|e| {
            crate::Error::ConfigurationError(format!("Failed to write config file: {}", e))
        })?;

        info!(
            "Saved meeting automation config to {}",
            self.config_path.display()
        );
        Ok(())
    }

    pub fn reset_to_default(&self) -> Result<()> {
        let default_config = AutomationConfig::default();
        self.save_config(&default_config)?;
        Ok(())
    }


    pub fn get_config_path(&self) -> &PathBuf {
        &self.config_path
    }
}

pub struct ConfigManager<R: Runtime> {
    storage: ConfigStorage<R>,
    cached_config: std::sync::Arc<tokio::sync::RwLock<Option<AutomationConfig>>>,
}

impl<R: Runtime> Clone for ConfigManager<R> {
    fn clone(&self) -> Self {
        Self {
            storage: self.storage.clone(),
            cached_config: self.cached_config.clone(),
        }
    }
}

impl<R: Runtime> ConfigManager<R> {
    pub fn new(app_handle: AppHandle<R>) -> Result<Self> {
        let storage = ConfigStorage::new(app_handle)?;

        Ok(Self {
            storage,
            cached_config: std::sync::Arc::new(tokio::sync::RwLock::new(None)),
        })
    }

    pub async fn get_config(&self) -> Result<AutomationConfig> {
        let cached = self.cached_config.read().await;

        if let Some(config) = cached.as_ref() {
            debug!("Returning cached config");
            return Ok(config.clone());
        }

        drop(cached);

        let config = self.storage.load_config()?;
        let mut cached = self.cached_config.write().await;
        *cached = Some(config.clone());

        Ok(config)
    }

    pub async fn save_config(&self, config: AutomationConfig) -> Result<()> {
        self.storage.save_config(&config)?;

        let mut cached = self.cached_config.write().await;
        *cached = Some(config);

        Ok(())
    }

    pub async fn update_config<F>(&self, updater: F) -> Result<AutomationConfig>
    where
        F: FnOnce(&mut AutomationConfig) -> Result<()>,
    {
        let mut config = self.get_config().await?;
        updater(&mut config)?;
        self.save_config(config.clone()).await?;
        Ok(config)
    }

    pub async fn reset_config(&self) -> Result<AutomationConfig> {
        self.storage.reset_to_default()?;

        let mut cached = self.cached_config.write().await;
        let default_config = AutomationConfig::default();
        *cached = Some(default_config.clone());

        Ok(default_config)
    }

    pub fn get_config_path(&self) -> &PathBuf {
        self.storage.get_config_path()
    }
}
