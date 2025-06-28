use chrono::{Duration, Utc};
use hypr_db_user::Event;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri_plugin_listener::ListenerPluginExt;
use tokio::sync::mpsc;

/// Represents different types of meeting activity signals
#[derive(Debug, Clone)]
pub enum MeetingSignal {
    AppLaunched(String),    // Meeting app bundle ID
    BrowserMeeting(String), // Meeting URL
    MicrophoneActive,       // Microphone in use
    CalendarEvent(String),  // Event ID from calendar
}

/// Meeting detection score and confidence
#[derive(Debug, Clone)]
pub struct MeetingScore {
    pub confidence: f64, // 0.0 to 1.0
    pub signals: Vec<MeetingSignal>,
    pub event_id: Option<String>,
    pub meeting_type: MeetingType,
}

#[derive(Debug, Clone)]
pub enum MeetingType {
    ScheduledEvent,  // Calendar event with high confidence
    DetectedMeeting, // Meeting detected via apps/browser
    AudioActivity,   // Microphone activity only
    Unknown,
}

/// Intelligent meeting detector that combines multiple signals
#[derive(Clone)]
pub struct MeetingDetector {
    signals: Arc<Mutex<HashMap<String, Vec<MeetingSignal>>>>,
    // Note: hypr_detect::Detector doesn't implement Clone, so we'll manage it differently
    signal_tx: mpsc::UnboundedSender<MeetingSignal>,
    signal_rx: Arc<Mutex<mpsc::UnboundedReceiver<MeetingSignal>>>,
    // Auto-recording configuration
    auto_record_enabled: Arc<Mutex<bool>>,
    auto_record_threshold: Arc<Mutex<f64>>,
    // App handle for triggering recording
    app_handle: Arc<Mutex<Option<tauri::AppHandle<tauri::Wry>>>>,
}

impl Default for MeetingDetector {
    fn default() -> Self {
        let (signal_tx, signal_rx) = mpsc::unbounded_channel();
        Self {
            signals: Arc::new(Mutex::new(HashMap::new())),
            signal_tx,
            signal_rx: Arc::new(Mutex::new(signal_rx)),
            auto_record_enabled: Arc::new(Mutex::new(false)),
            auto_record_threshold: Arc::new(Mutex::new(0.7)),
            app_handle: Arc::new(Mutex::new(None)),
        }
    }
}

impl MeetingDetector {
    /// Check if a URL is a recognized meeting URL
    pub fn is_meeting_url(&self, url: &str) -> bool {
        url.contains("meet.google.com")
            || url.contains("zoom.us/j/")
            || url.contains("teams.microsoft.com")
    }

    /// Start monitoring for meeting signals
    pub fn start_monitoring(&mut self) {
        // Note: For now, we'll rely on the existing notification detector
        // In a full implementation, we'd manage a separate detector here
        tracing::debug!("Meeting detector monitoring started");
    }

    /// Stop monitoring
    pub fn stop_monitoring(&mut self) {
        tracing::debug!("Meeting detector monitoring stopped");
    }

    /// Configure the app handle for auto-recording
    pub fn set_app_handle(&self, app_handle: tauri::AppHandle<tauri::Wry>) {
        if let Ok(mut handle) = self.app_handle.lock() {
            *handle = Some(app_handle);
        }
    }

    /// Set auto-recording configuration
    /// 
    /// # Arguments
    /// * `enabled` - Whether auto-recording is enabled
    /// * `threshold` - Confidence threshold for auto-recording (must be between 0.0 and 1.0)
    /// 
    /// # Returns
    /// * `Ok(())` if configuration was set successfully
    /// * `Err(String)` if threshold is out of valid range or lock acquisition fails
    pub fn set_auto_record_config(&self, enabled: bool, threshold: f64) -> Result<(), String> {
        // Validate threshold is within acceptable range BEFORE making any changes
        if !threshold.is_finite() {
            let error_msg = format!("Invalid threshold: {} (must be a finite number)", threshold);
            tracing::warn!("auto_record_config_validation_failed: {}", error_msg);
            return Err(error_msg);
        }
        
        if !(0.0..=1.0).contains(&threshold) {
            let error_msg = format!("Invalid threshold: {} (must be between 0.0 and 1.0)", threshold);
            tracing::warn!("auto_record_config_validation_failed: {}", error_msg);
            return Err(error_msg);
        }

        // Only proceed with updates if validation passed
        // Acquire both locks before making any changes to ensure atomicity
        let mut auto_enabled = self.auto_record_enabled.lock().map_err(|_| {
            let error_msg = "Failed to acquire lock for auto_record_enabled".to_string();
            tracing::error!("auto_record_config_lock_failed: {}", error_msg);
            error_msg
        })?;

        let mut auto_threshold = self.auto_record_threshold.lock().map_err(|_| {
            let error_msg = "Failed to acquire lock for auto_record_threshold".to_string();
            tracing::error!("auto_record_config_lock_failed: {}", error_msg);
            error_msg
        })?;

        // Update both values atomically
        *auto_enabled = enabled;
        *auto_threshold = threshold;

        tracing::debug!(
            "auto_record_config_updated: enabled={}, threshold={:.2}",
            enabled,
            threshold
        );

        Ok(())
    }

    /// Process a meeting signal and potentially trigger auto-recording
    pub fn process_signal(&self, signal: MeetingSignal) -> Option<MeetingScore> {
        let auto_enabled = *self.auto_record_enabled.lock().ok()?;
        let threshold = *self.auto_record_threshold.lock().ok()?;

        // Store the signal for correlation analysis
        self.store_signal(signal.clone());

        // Calculate enhanced confidence score based on signal correlation
        let score = self.calculate_enhanced_score(&signal);

        // Always return the score for notification purposes, but only trigger auto-recording if enabled and above threshold
        if auto_enabled && score.confidence >= threshold {
            if let Ok(app_handle_guard) = self.app_handle.lock() {
                if let Some(app_handle) = app_handle_guard.as_ref() {
                    self.trigger_auto_recording(app_handle.clone(), &score);
                }
            }
        }

        Some(score)
    }

    /// Store signal for correlation analysis
    fn store_signal(&self, signal: MeetingSignal) {
        if let Ok(mut signals) = self.signals.lock() {
            let now = chrono::Utc::now();
            let time_key = now.timestamp().to_string();

            // Store recent signals (last 10 minutes) for correlation
            let cutoff = now - Duration::minutes(10);
            signals.retain(|k, _| {
                k.parse::<i64>()
                    .map_or(false, |ts| ts >= cutoff.timestamp())
            });

            signals
                .entry(time_key)
                .or_insert_with(Vec::new)
                .push(signal);
        }
    }

    /// Calculate enhanced confidence score with signal correlation
    fn calculate_enhanced_score(&self, current_signal: &MeetingSignal) -> MeetingScore {
        let base_confidence = self.get_base_confidence(current_signal);

        // Get recent signals for correlation analysis
        let recent_signals = self.get_recent_signals(Duration::minutes(5));

        // Calculate correlation bonuses
        let mut correlation_bonus = 0.0;
        let mut total_signals = vec![current_signal.clone()];

        // Check for signal correlation patterns
        for signals_group in recent_signals.values() {
            for signal in signals_group {
                total_signals.push(signal.clone());

                // Correlation bonuses for complementary signals
                match (current_signal, signal) {
                    // Mic + Calendar = Strong meeting indication
                    (MeetingSignal::MicrophoneActive, MeetingSignal::CalendarEvent(_))
                    | (MeetingSignal::CalendarEvent(_), MeetingSignal::MicrophoneActive) => {
                        correlation_bonus += 0.2;
                    }
                    // Browser + Mic = Active meeting
                    (MeetingSignal::MicrophoneActive, MeetingSignal::BrowserMeeting(_))
                    | (MeetingSignal::BrowserMeeting(_), MeetingSignal::MicrophoneActive) => {
                        correlation_bonus += 0.25;
                    }
                    // App + Mic = Active meeting
                    (MeetingSignal::MicrophoneActive, MeetingSignal::AppLaunched(_))
                    | (MeetingSignal::AppLaunched(_), MeetingSignal::MicrophoneActive) => {
                        correlation_bonus += 0.2;
                    }
                    // Calendar + Browser/App = Scheduled meeting starting
                    (MeetingSignal::CalendarEvent(_), MeetingSignal::BrowserMeeting(_))
                    | (MeetingSignal::BrowserMeeting(_), MeetingSignal::CalendarEvent(_))
                    | (MeetingSignal::CalendarEvent(_), MeetingSignal::AppLaunched(_))
                    | (MeetingSignal::AppLaunched(_), MeetingSignal::CalendarEvent(_)) => {
                        correlation_bonus += 0.15;
                    }
                    // Multiple mic signals = sustained activity
                    (MeetingSignal::MicrophoneActive, MeetingSignal::MicrophoneActive) => {
                        correlation_bonus += 0.1;
                    }
                    _ => {}
                }
            }
        }

        // Apply temporal proximity bonus for calendar events
        let temporal_bonus = match current_signal {
            MeetingSignal::CalendarEvent(_) => {
                // This would need calendar integration to calculate actual time proximity
                0.1 // Placeholder bonus
            }
            _ => 0.0,
        };

        // Calculate final confidence (capped at 1.0)
        let final_confidence = (base_confidence + correlation_bonus + temporal_bonus).min(1.0);

        // Determine meeting type based on signal composition
        let meeting_type = self.determine_meeting_type(&total_signals);

        MeetingScore {
            confidence: final_confidence,
            signals: total_signals,
            event_id: self.extract_event_id(current_signal),
            meeting_type,
        }
    }

    /// Get base confidence for a single signal
    fn get_base_confidence(&self, signal: &MeetingSignal) -> f64 {
        match signal {
            MeetingSignal::MicrophoneActive => 0.5, // Moderate - could be anything
            MeetingSignal::AppLaunched(app) => {
                // Higher confidence for dedicated meeting apps
                if app.contains("zoom") || app.contains("teams") || app.contains("meet") {
                    0.8
                } else {
                    0.6
                }
            }
            MeetingSignal::BrowserMeeting(url) => {
                // Very high confidence for meeting URLs
                if self.is_meeting_url(url) {
                    0.9
                } else {
                    0.5
                }
            }
            MeetingSignal::CalendarEvent(_) => 0.7, // High - scheduled meeting
        }
    }

    /// Get recent signals within the specified duration
    fn get_recent_signals(&self, duration: Duration) -> HashMap<String, Vec<MeetingSignal>> {
        if let Ok(signals) = self.signals.lock() {
            let cutoff = chrono::Utc::now() - duration;
            signals
                .iter()
                .filter(|(k, _)| {
                    k.parse::<i64>()
                        .map_or(false, |ts| ts >= cutoff.timestamp())
                })
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        } else {
            HashMap::new()
        }
    }

    /// Determine meeting type based on signal composition
    fn determine_meeting_type(&self, signals: &[MeetingSignal]) -> MeetingType {
        let has_calendar = signals
            .iter()
            .any(|s| matches!(s, MeetingSignal::CalendarEvent(_)));
        let has_browser = signals
            .iter()
            .any(|s| matches!(s, MeetingSignal::BrowserMeeting(_)));
        let has_app = signals
            .iter()
            .any(|s| matches!(s, MeetingSignal::AppLaunched(_)));
        let has_mic = signals
            .iter()
            .any(|s| matches!(s, MeetingSignal::MicrophoneActive));

        if has_calendar && (has_browser || has_app) {
            MeetingType::ScheduledEvent
        } else if has_browser || has_app {
            MeetingType::DetectedMeeting
        } else if has_mic {
            MeetingType::AudioActivity
        } else {
            MeetingType::Unknown
        }
    }

    /// Extract event ID from signal if available
    fn extract_event_id(&self, signal: &MeetingSignal) -> Option<String> {
        match signal {
            MeetingSignal::CalendarEvent(id) => Some(id.clone()),
            _ => None,
        }
    }

    /// Trigger auto-recording for a meeting
    /// 
    /// Uses the listener plugin's extension trait to maintain proper separation of concerns.
    /// This avoids direct access to the listener plugin's internal state and allows it to
    /// handle the recording start independently.
    fn trigger_auto_recording(&self, app_handle: tauri::AppHandle<tauri::Wry>, score: &MeetingScore) {
        tracing::info!(
            "triggering_auto_recording: confidence={}, type={:?}",
            score.confidence,
            score.meeting_type
        );

        // Generate a new session ID and trigger recording
        let session_id = format!("meeting-{}", chrono::Utc::now().timestamp_millis());

        // Use the listener plugin's extension method instead of direct state access
        // This maintains proper plugin separation and encapsulation
        let app_handle_clone = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            app_handle_clone.start_session(session_id).await;
            tracing::info!("auto_recording_started_successfully");
        });
    }

    /// Process signals and calculate meeting probability for events
    pub async fn calculate_meeting_scores(
        &self,
        events: &[Event],
        _time_window_minutes: i64,
    ) -> Vec<MeetingScore> {
        let now = Utc::now();
        let mut scores = Vec::new();

        // For now, create simplified scores based on calendar events near current time
        for event in events {
            let event_start = event.start_date;

            // Check if event is within reasonable time window (15 minutes before to 5 minutes after)
            let time_diff = (now - event_start).num_minutes();
            if time_diff < -15 || time_diff > 5 {
                continue;
            }

            // Simple time-based scoring for now
            let confidence = match time_diff.abs() {
                0..=2 => 0.8,  // Very close to start time
                3..=5 => 0.7,  // Close to start time
                6..=10 => 0.6, // Nearby
                _ => 0.4,      // Within window
            };

            let score = MeetingScore {
                confidence,
                signals: vec![MeetingSignal::CalendarEvent(event.id.clone())],
                event_id: Some(event.id.clone()),
                meeting_type: MeetingType::ScheduledEvent,
            };

            scores.push(score);
        }

        // Sort by confidence (highest first)
        scores.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
        scores
    }
}

/// Helper function to extract meeting ID from URLs
pub fn extract_meeting_id(url: &str) -> Option<String> {
    if url.contains("meet.google.com") {
        url.split('/').last().map(|s| s.to_string())
    } else if url.contains("zoom.us/j/") {
        url.split("/j/")
            .nth(1)?
            .split('?')
            .next()
            .map(|s| s.to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_meeting_url_detection() {
        let detector = MeetingDetector::default();

        assert!(detector.is_meeting_url("https://meet.google.com/abc-def-ghi"));
        assert!(detector.is_meeting_url("https://zoom.us/j/123456789"));
        assert!(detector.is_meeting_url("https://teams.microsoft.com/l/meetup-join/"));
        assert!(!detector.is_meeting_url("https://google.com"));
    }

    #[test]
    fn test_extract_meeting_id() {
        assert_eq!(
            extract_meeting_id("https://meet.google.com/abc-def-ghi"),
            Some("abc-def-ghi".to_string())
        );
        assert_eq!(
            extract_meeting_id("https://zoom.us/j/123456789?pwd=test"),
            Some("123456789".to_string())
        );
        assert_eq!(extract_meeting_id("https://google.com"), None);
    }

    #[test]
    fn test_set_auto_record_config_validation() {
        let detector = MeetingDetector::default();

        // Test valid threshold values
        assert!(detector.set_auto_record_config(true, 0.0).is_ok());
        assert!(detector.set_auto_record_config(true, 0.5).is_ok());
        assert!(detector.set_auto_record_config(true, 1.0).is_ok());
        assert!(detector.set_auto_record_config(false, 0.7).is_ok());

        // Test invalid threshold values - below range
        assert!(detector.set_auto_record_config(true, -0.1).is_err());
        assert!(detector.set_auto_record_config(true, -1.0).is_err());

        // Test invalid threshold values - above range
        assert!(detector.set_auto_record_config(true, 1.1).is_err());
        assert!(detector.set_auto_record_config(true, 2.0).is_err());

        // Test invalid threshold values - non-finite numbers
        assert!(detector.set_auto_record_config(true, f64::NAN).is_err());
        assert!(detector.set_auto_record_config(true, f64::INFINITY).is_err());
        assert!(detector.set_auto_record_config(true, f64::NEG_INFINITY).is_err());
    }

    #[test]
    fn test_set_auto_record_config_error_messages() {
        let detector = MeetingDetector::default();

        // Test error message for out of range threshold
        let result = detector.set_auto_record_config(true, 1.5);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("must be between 0.0 and 1.0"));

        // Test error message for non-finite threshold
        let result = detector.set_auto_record_config(true, f64::NAN);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("must be a finite number"));
    }

    #[test]
    fn test_auto_record_config_state_preservation_on_error() {
        let detector = MeetingDetector::default();

        // Set valid initial configuration
        assert!(detector.set_auto_record_config(true, 0.8).is_ok());

        // Verify initial state is set correctly
        assert_eq!(*detector.auto_record_enabled.lock().unwrap(), true);
        assert_eq!(*detector.auto_record_threshold.lock().unwrap(), 0.8);

        // Try to set invalid configuration - should fail and preserve state
        assert!(detector.set_auto_record_config(false, 1.5).is_err());

        // Verify original state is preserved (threshold unchanged, enabled unchanged)
        assert_eq!(*detector.auto_record_enabled.lock().unwrap(), true);
        assert_eq!(*detector.auto_record_threshold.lock().unwrap(), 0.8);
    }
}
