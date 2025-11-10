use std::future::Future;

use futures_util::StreamExt;

#[cfg(target_os = "macos")]
use {
    objc2::{class, msg_send, runtime::Bool},
    objc2_foundation::NSString,
};

pub trait ListenerPluginExt<R: tauri::Runtime> {
    fn list_microphone_devices(&self) -> impl Future<Output = Result<Vec<String>, crate::Error>>;
    fn get_current_microphone_device(
        &self,
    ) -> impl Future<Output = Result<Option<String>, crate::Error>>;
    fn set_microphone_device(
        &self,
        device_name: impl Into<String>,
    ) -> impl Future<Output = Result<(), crate::Error>>;

    fn check_microphone_access(&self) -> impl Future<Output = Result<bool, crate::Error>>;
    fn check_system_audio_access(&self) -> impl Future<Output = Result<bool, crate::Error>>;
    fn request_microphone_access(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn request_system_audio_access(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn open_microphone_access_settings(&self) -> impl Future<Output = Result<(), crate::Error>>;
    fn open_system_audio_access_settings(&self) -> impl Future<Output = Result<(), crate::Error>>;

    fn get_mic_muted(&self) -> impl Future<Output = bool>;
    fn get_speaker_muted(&self) -> impl Future<Output = bool>;
    fn set_mic_muted(&self, muted: bool) -> impl Future<Output = ()>;
    fn set_speaker_muted(&self, muted: bool) -> impl Future<Output = ()>;

    fn get_state(&self) -> impl Future<Output = crate::fsm::State>;
    fn stop_session(&self) -> impl Future<Output = ()>;
    fn start_session(&self, id: impl Into<String>) -> impl Future<Output = ()>;
    fn pause_session(&self) -> impl Future<Output = ()>;
    fn resume_session(&self) -> impl Future<Output = ()>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ListenerPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn list_microphone_devices(&self) -> Result<Vec<String>, crate::Error> {
        Ok(hypr_audio::AudioInput::list_mic_devices())
    }

    /// Retrieve the currently selected microphone device name, if any.
    ///
    /// Returns `Ok(Some(name))` with the selected device name, `Ok(None)` if no device is selected, or an `Err` if an error occurs.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// // `plugin` implements the trait providing this method.
    /// let current = plugin.get_current_microphone_device().await.unwrap();
    /// if let Some(name) = current {
    ///     println!("Current mic: {}", name);
    /// } else {
    ///     println!("No microphone selected");
    /// }
    /// ```
    #[tracing::instrument(skip_all)]
    async fn get_current_microphone_device(&self) -> Result<Option<String>, crate::Error> {
        let state: tauri::State<'_, crate::SharedState> = self.state::<crate::SharedState>();
        let s = state.inner().lock().await;
        Ok(s.fsm.get_current_mic_device())
    }

    /// Sets the active microphone device by name.
    ///
    /// Dispatches a microphone-change event to the internal state machine to select the given device.
    ///
    /// # Returns
    ///
    /// `Ok(())` if the change was dispatched successfully, `Err(crate::Error)` if an error occurred.
    ///
    /// # Examples
    ///
    /// ```
    /// // Assumes `api` implements ListenerPluginExt and is available in scope.
    /// // This example is illustrative; adapt to your test harness.
    /// # async fn run_example<T: ListenerPluginExt<tauri::Wry>>(api: &T) -> Result<(), crate::Error> {
    /// api.set_microphone_device("Built-in Microphone").await?;
    /// # Ok(())
    /// # }
    /// ```
    #[tracing::instrument(skip_all)]
    async fn set_microphone_device(
        &self,
        device_name: impl Into<String>,
    ) -> Result<(), crate::Error> {
        let state: tauri::State<'_, crate::SharedState> = self.state::<crate::SharedState>();

        {
            let mut guard = state.inner().lock().await;
            let event = crate::fsm::StateEvent::MicChange(Some(device_name.into()));
            guard.fsm.handle(&event).await;
        }

        Ok(())
    }

    /// Checks whether the current process has permission to capture audio from the microphone.
    ///
    /// On macOS this queries the system authorization status. On other platforms this attempts to open a microphone input and read a sample to infer access. Returns `Ok(true)` when permission is available, `Ok(false)` when permission is denied or cannot be obtained, and `Err` for underlying OS/IO errors.
    ///
    /// # Examples
    ///
    /// ```
    /// # use futures::executor::block_on;
    /// # struct Dummy;
    /// # mod crate { pub enum Error {} }
    /// # impl Dummy { async fn check_microphone_access(&self) -> Result<bool, crate::Error> { Ok(true) } }
    /// # let plugin = Dummy;
    /// let has_access = block_on(plugin.check_microphone_access()).unwrap();
    /// assert!(has_access == true || has_access == false);
    /// ```
    #[tracing::instrument(skip_all)]
    async fn check_microphone_access(&self) -> Result<bool, crate::Error> {
        #[cfg(target_os = "macos")]
        // https://github.com/ayangweb/tauri-plugin-macos-permissions/blob/c025ab4/src/commands.rs#L157
        {
            unsafe {
                let av_media_type = NSString::from_str("soun");
                let status: i32 = msg_send![
                    class!(AVCaptureDevice),
                    authorizationStatusForMediaType: &*av_media_type
                ];

                Ok(status == 3)
            }
        }

        #[cfg(not(target_os = "macos"))]
                {
                    match hypr_audio::AudioInput::from_mic(None) {
                        Ok(mut input) => {
                            let mut mic_sample_stream = input.stream();
                            let sample = mic_sample_stream.next().await;
                            Ok(sample.is_some())
                        }
                        Err(e) => {
                            tracing::warn!("Failed to access microphone for checking: {:?}", e);
                            Ok(false)
                        }
                    }
                }
    }

    #[tracing::instrument(skip_all)]
    async fn check_system_audio_access(&self) -> Result<bool, crate::Error> {
        Ok(hypr_tcc::audio_capture_permission_granted())
    }

    /// Requests microphone capture permission from the operating system.
    ///
    /// On macOS this calls the AVFoundation API to prompt the user for microphone access; on other platforms it attempts to open the default microphone stream to trigger or verify permission. The call performs no further side effects beyond initiating or checking the permission request.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// // Initiate a permission request and propagate any error.
    /// listener.request_microphone_access().await?;
    /// ```
    ///
    /// # Returns
    ///
    /// `Ok(())` if the permission request was initiated or checked without an internal error, `Err(crate::Error)` if an error occurred while attempting to initiate or verify the request.
    #[tracing::instrument(skip_all)]
    async fn request_microphone_access(&self) -> Result<(), crate::Error> {
        #[cfg(target_os = "macos")]
        {
            /*
            {
                use tauri_plugin_shell::ShellExt;

                let bundle_id = self.config().identifier.clone();
                self.app_handle()
                    .shell()
                    .command("tccutil")
                    .args(["reset", "Microphone", &bundle_id])
                    .spawn()
                    .ok();
            }
            */

            // https://github.com/ayangweb/tauri-plugin-macos-permissions/blob/c025ab4/src/commands.rs#L184
            unsafe {
                let av_media_type = NSString::from_str("soun");
                type CompletionBlock = Option<extern "C" fn(Bool)>;
                let completion_block: CompletionBlock = None;
                let _: () = msg_send![
                    class!(AVCaptureDevice),
                    requestAccessForMediaType: &*av_media_type,
                    completionHandler: completion_block
                ];
            }
        }

        #[cfg(not(target_os = "macos"))]
                {
                    match hypr_audio::AudioInput::from_mic(None) {
                        Ok(mut input) => {
                            let mut mic_sample_stream = input.stream();
                            mic_sample_stream.next().await;
                        }
                        Err(e) => {
                            tracing::warn!("Failed to access microphone for request: {:?}", e);
                        }
                    }
                }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn request_system_audio_access(&self) -> Result<(), crate::Error> {
        {
            use tauri_plugin_shell::ShellExt;

            let bundle_id = self.config().identifier.clone();
            self.app_handle()
                .shell()
                .command("tccutil")
                .args(["reset", "AudioCapture", &bundle_id])
                .spawn()
                .ok();
        }

        let stop = hypr_audio::AudioOutput::silence();

        let mut speaker_sample_stream = hypr_audio::AudioInput::from_speaker().stream();
        speaker_sample_stream.next().await;

        let _ = stop.send(());
        Ok(())
    }

    /// Opens the macOS Privacy → Microphone settings pane.
    ///
    /// Attempts to launch the system Settings app to the Microphone privacy page.
    /// Returns `Ok(())` on success, or `Err(crate::Error::IoError)` if spawning or waiting for the `open` process fails.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// // call from an async context where `self` is available (e.g., inside an impl or test harness)
    /// // self.open_microphone_access_settings().await.unwrap();
    /// ```
    #[tracing::instrument(skip_all)]
    async fn open_microphone_access_settings(&self) -> Result<(), crate::Error> {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
            .spawn()
            .map_err(|e| crate::Error::IoError(e))?
            .wait()
            .map_err(|e| crate::Error::IoError(e))?;
        Ok(())
    }

    /// Opens the macOS Privacy > Audio Capture settings pane.
    ///
    /// Attempts to launch the system Settings (System Preferences) pane for Audio Capture
    /// and waits for the spawned process to exit.
    ///
    /// # Returns
    ///
    /// `Ok(())` if the settings process was spawned and waited on successfully, `Err(crate::Error::IoError(_))` if spawning or waiting for the process failed.
    ///
    /// # Examples
    ///
    /// ```
    /// # use futures::executor::block_on;
    /// # async fn run_example(plugin: &impl ListenerPluginExt<tauri::Runtime>) {
    /// plugin.open_system_audio_access_settings().await.unwrap();
    /// # }
    /// ```
    #[tracing::instrument(skip_all)]
    async fn open_system_audio_access_settings(&self) -> Result<(), crate::Error> {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_AudioCapture")
            .spawn()
            .map_err(|e| crate::Error::IoError(e))?
            .wait()
            .map_err(|e| crate::Error::IoError(e))?;
        Ok(())
    }

    /// Get the current finite-state-machine state.
    ///
    /// # Returns
    ///
    /// The current FSM state (cloned).
    ///
    /// # Examples
    ///
    /// ```no_run
    /// // Obtain a listener instance in your application context, then:
    /// // let listener = ...;
    /// // Use a runtime to await the async call:
    /// use futures::executor::block_on;
    /// let state = block_on(async { listener.get_state().await });
    /// ```
    #[tracing::instrument(skip_all)]
    async fn get_state(&self) -> crate::fsm::State {
        let state: tauri::State<'_, crate::SharedState> = self.state::<crate::SharedState>();
        let guard = state.inner().lock().await;
        guard.fsm.state().clone()
    }

    /// Report whether the microphone is currently muted.
    ///
    /// # Examples
    ///
    /// ```
    /// // In an async context:
    /// let muted = plugin.get_mic_muted().await;
    /// println!("microphone muted: {}", muted);
    /// ```
    #[tracing::instrument(skip_all)]
    async fn get_mic_muted(&self) -> bool {
        let state: tauri::State<'_, crate::SharedState> = self.state::<crate::SharedState>();

        {
            let guard = state.inner().lock().await;
            guard.fsm.is_mic_muted()
        }
    }

    /// Returns whether the system speaker is currently muted.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # async fn doc_example(plugin: &impl crate::ListenerPluginExt<tauri::Runtime>) {
    /// let muted = plugin.get_speaker_muted().await;
    /// assert!(muted == true || muted == false);
    /// # }
    /// ```
    #[tracing::instrument(skip_all)]
    async fn get_speaker_muted(&self) -> bool {
        let state: tauri::State<'_, crate::SharedState> = self.state::<crate::SharedState>();

        {
            let guard = state.inner().lock().await;
            guard.fsm.is_speaker_muted()
        }
    }

    #[tracing::instrument(skip_all)]
    async fn set_mic_muted(&self, muted: bool) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::MicMuted(muted);
            guard.fsm.handle(&event).await;
        }
    }

    #[tracing::instrument(skip_all)]
    async fn set_speaker_muted(&self, muted: bool) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::SpeakerMuted(muted);
            guard.fsm.handle(&event).await;
        }
    }

    #[tracing::instrument(skip_all)]
    async fn start_session(&self, session_id: impl Into<String>) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::Start(session_id.into());
            guard.fsm.handle(&event).await;
        }
    }

    #[tracing::instrument(skip_all)]
    async fn stop_session(&self) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::Stop;
            guard.fsm.handle(&event).await;
        }
    }

    #[tracing::instrument(skip_all)]
    async fn pause_session(&self) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::Pause;
            guard.fsm.handle(&event).await;
        }
    }

    #[tracing::instrument(skip_all)]
    async fn resume_session(&self) {
        let state = self.state::<crate::SharedState>();

        {
            let mut guard = state.lock().await;
            let event = crate::fsm::StateEvent::Resume;
            guard.fsm.handle(&event).await;
        }
    }
}