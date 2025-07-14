use crate::automation::MeetingAutomation;
use crate::config::AutomationConfig;
use crate::{ManagedState, Result};
use tauri::{AppHandle, Emitter, Manager, Runtime};

pub trait MeetingAutomationPluginExt<R: Runtime> {
    fn start_meeting_automation(&self) -> Result<()>;
    fn stop_meeting_automation(&self) -> Result<()>;
    fn get_automation_status(&self) -> Result<bool>;
    fn configure_automation(&self, config: AutomationConfig) -> Result<()>;
    fn get_automation_config(&self) -> Result<AutomationConfig>;
    fn test_meeting_detection(&self) -> Result<()>;
}

impl<R: Runtime> MeetingAutomationPluginExt<R> for AppHandle<R> {
    fn start_meeting_automation(&self) -> Result<()> {
        let config = {
            let state = self.state::<ManagedState<R>>();
            let state = state.lock().unwrap();

            if state.automation_handle.is_some() {
                return Err(crate::Error::AutomationAlreadyRunning);
            }

            let config_manager = state.config_manager.as_ref().ok_or_else(|| {
                crate::Error::ConfigurationError("Config manager not initialized".to_string())
            })?;

            tokio::task::block_in_place(|| {
                tokio::runtime::Handle::current()
                    .block_on(async { config_manager.get_config().await })
            })?
        };

        let mut automation = MeetingAutomation::new(config, self.clone())?;
        automation.start()?;

        let handle = tokio::spawn(async move {
            loop {
                if !automation.is_running() {
                    break;
                }
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            }
        });

        {
            let state = self.state::<ManagedState<R>>();
            let mut state = state.lock().unwrap();
            state.automation_handle = Some(handle);
        }

        Ok(())
    }

    fn stop_meeting_automation(&self) -> Result<()> {
        let state = self.state::<ManagedState<R>>();
        let mut state = state.lock().unwrap();

        if let Some(handle) = state.automation_handle.take() {
            handle.abort();
        } else {
            return Err(crate::Error::AutomationNotRunning);
        }

        Ok(())
    }

    fn get_automation_status(&self) -> Result<bool> {
        let state = self.state::<ManagedState<R>>();
        let state = state.lock().unwrap();

        Ok(state.automation_handle.is_some())
    }

    fn configure_automation(&self, config: AutomationConfig) -> Result<()> {
        let config_manager = {
            let state = self.state::<ManagedState<R>>();
            let state = state.lock().unwrap();

            state
                .config_manager
                .as_ref()
                .ok_or_else(|| {
                    crate::Error::ConfigurationError("Config manager not initialized".to_string())
                })?
                .clone()
        };

        tokio::spawn(async move {
            if let Err(e) = config_manager.save_config(config).await {
                tracing::error!("Failed to save automation config: {}", e);
            }
        });

        Ok(())
    }

    fn get_automation_config(&self) -> Result<AutomationConfig> {
        let config_manager = {
            let state = self.state::<ManagedState<R>>();
            let state = state.lock().unwrap();

            state
                .config_manager
                .as_ref()
                .ok_or_else(|| {
                    crate::Error::ConfigurationError("Config manager not initialized".to_string())
                })?
                .clone()
        };

        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async { config_manager.get_config().await })
        })
    }

    fn test_meeting_detection(&self) -> Result<()> {
        let is_running = {
            let state = self.state::<ManagedState<R>>();
            let state = state.lock().unwrap();
            state.automation_handle.is_some()
        };

        if !is_running {
            return Err(crate::Error::AutomationNotRunning);
        }

        let app_handle = self.clone();

        tokio::spawn(async move {
            tracing::info!("🧪 Running meeting detection test");

            app_handle
                .emit(
                    "meeting_notification",
                    &serde_json::json!({
                        "title": "Test: Meeting Detection",
                        "message": "Testing all meeting detection features",
                        "actions": [["OK", "ok"]]
                    }),
                )
                .ok();

            tracing::info!("✓ Meeting detection test completed");
        });

        Ok(())
    }
}
