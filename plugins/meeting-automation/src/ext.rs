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
        let config_manager = {
            let state = self.state::<ManagedState<R>>();
            let state = state.lock().unwrap();

            if state.automation.is_some() {
                return Err(crate::Error::AutomationAlreadyRunning);
            }

            state
                .config_manager
                .as_ref()
                .ok_or_else(|| {
                    crate::Error::ConfigurationError("Config manager not initialized".to_string())
                })?
                .clone()
        };

        let config = tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async { config_manager.get_config().await })
        })?;

        let mut automation = MeetingAutomation::new(config, self.clone())?;
        automation.start()?;

        {
            let state = self.state::<ManagedState<R>>();
            let mut state = state.lock().unwrap();
            state.automation = Some(automation);
        }

        Ok(())
    }

    fn stop_meeting_automation(&self) -> Result<()> {
        let state = self.state::<ManagedState<R>>();
        let mut state = state.lock().unwrap();

        if let Some(mut automation) = state.automation.take() {
            automation.stop()?;
        } else {
            return Err(crate::Error::AutomationNotRunning);
        }

        Ok(())
    }

    fn get_automation_status(&self) -> Result<bool> {
        let state = self.state::<ManagedState<R>>();
        let state = state.lock().unwrap();

        Ok(state.automation.as_ref().map_or(false, |a| a.is_running()))
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

        tokio::runtime::Handle::current()
            .block_on(config_manager.save_config(config))
            .map_err(|e| {
                crate::Error::ConfigurationError(format!("Failed to save automation config: {}", e))
            })?;

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
            state.automation.as_ref().map_or(false, |a| a.is_running())
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
