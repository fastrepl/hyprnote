use chrono::{DateTime, Duration, Utc};
use hypr_db_user::Event;
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

/// Timestamped signal entry for the circular buffer
#[derive(Debug, Clone)]
struct TimestampedSignal {
    signal: MeetingSignal,
    timestamp: DateTime<Utc>,
}

/// Circular buffer for storing recent meeting signals
#[derive(Debug, Clone)]
struct SignalBuffer {
    buffer: Vec<Option<TimestampedSignal>>,
    head: usize,
    size: usize,
    capacity: usize,
}

impl SignalBuffer {
    fn new(capacity: usize) -> Self {
        Self {
            buffer: vec![None; capacity],
            head: 0,
            size: 0,
            capacity,
        }
    }

    fn push(&mut self, signal: MeetingSignal) {
        let entry = TimestampedSignal {
            signal,
            timestamp: Utc::now(),
        };

        self.buffer[self.head] = Some(entry);
        self.head = (self.head + 1) % self.capacity;
        if self.size < self.capacity {
            self.size += 1;
        }
    }

    fn get_recent_signals(&self, duration: Duration) -> Vec<MeetingSignal> {
        let cutoff = Utc::now() - duration;
        let mut signals = Vec::new();

        // Iterate through the buffer starting from the oldest entry
        let start_idx = if self.size == self.capacity {
            self.head
        } else {
            0
        };

        for i in 0..self.size {
            let idx = (start_idx + i) % self.capacity;
            if let Some(ref entry) = self.buffer[idx] {
                if entry.timestamp >= cutoff {
                    signals.push(entry.signal.clone());
                }
            }
        }

        signals
    }

    fn cleanup_old_signals(&mut self, max_age: Duration) {
        let cutoff = Utc::now() - max_age;
        let mut new_size = 0;

        // Count valid signals (more recent than cutoff)
        for i in 0..self.size {
            let idx = if self.size == self.capacity {
                (self.head + i) % self.capacity
            } else {
                i
            };

            if let Some(ref entry) = self.buffer[idx] {
                if entry.timestamp >= cutoff {
                    new_size += 1;
                } else {
                    // Clear old entries
                    self.buffer[idx] = None;
                }
            }
        }

        self.size = new_size;
    }
}

/// Intelligent meeting detector that combines multiple signals
#[derive(Clone)]
pub struct MeetingDetector {
    signal_buffer: Arc<Mutex<SignalBuffer>>,
    // Note: hypr_detect::Detector doesn't implement Clone, so we'll manage it differently
    signal_tx: mpsc::UnboundedSender<MeetingSignal>,
    signal_rx: Arc<Mutex<mpsc::UnboundedReceiver<MeetingSignal>>>,
    // Auto-recording configuration
    auto_record_enabled: Arc<Mutex<bool>>,
    auto_record_threshold: Arc<Mutex<f64>>,
    // App handle for triggering recording
    app_handle: Arc<Mutex<Option<tauri::AppHandle<tauri::Wry>>>>,
    // Event data for temporal calculations
    current_events: Arc<Mutex<Vec<Event>>>,
}

impl Default for MeetingDetector {
    fn default() -> Self {
        let (signal_tx, signal_rx) = mpsc::unbounded_channel();
        Self {
            signal_buffer: Arc::new(Mutex::new(SignalBuffer::new(1000))), // Buffer for 1000 signals
            signal_tx,
            signal_rx: Arc::new(Mutex::new(signal_rx)),
            auto_record_enabled: Arc::new(Mutex::new(false)),
            auto_record_threshold: Arc::new(Mutex::new(0.7)),
            app_handle: Arc::new(Mutex::new(None)),
            current_events: Arc::new(Mutex::new(Vec::new())),
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

    /// Update the current events for temporal calculations
    pub fn update_events(&self, events: Vec<Event>) {
        if let Ok(mut current_events) = self.current_events.lock() {
            *current_events = events;
        }
    }

    /// Set auto-recording configuration
    ///
    /// # Arguments
    /// * `enabled` - Whether auto-recording is enabled
    /// * `threshold` - Confidence threshold for auto-recording (must be between 0.0 and 1.0)
    pub fn set_auto_record_config(&self, enabled: bool, threshold: f64) {
        // Validate threshold is within acceptable range
        assert!(
            threshold.is_finite(),
            "Invalid threshold: {} (must be a finite number)",
            threshold
        );
        assert!(
            (0.0..=1.0).contains(&threshold),
            "Invalid threshold: {} (must be between 0.0 and 1.0)",
            threshold
        );

        // Acquire both locks and update values
        let mut auto_enabled = self
            .auto_record_enabled
            .lock()
            .expect("Failed to acquire lock for auto_record_enabled");
        let mut auto_threshold = self
            .auto_record_threshold
            .lock()
            .expect("Failed to acquire lock for auto_record_threshold");

        // Update both values
        *auto_enabled = enabled;
        *auto_threshold = threshold;

        tracing::debug!(
            "auto_record_config_updated: enabled={}, threshold={:.2}",
            enabled,
            threshold
        );
    }

    /// Process a meeting signal and potentially trigger auto-recording
    pub fn process_signal(&self, signal: MeetingSignal) -> Option<MeetingScore> {
        let auto_enabled = *self.auto_record_enabled.lock().unwrap();
        let threshold = *self.auto_record_threshold.lock().unwrap();

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
        let mut buffer = self
            .signal_buffer
            .lock()
            .expect("Failed to acquire signal buffer lock");

        // Add the signal to the circular buffer
        buffer.push(signal);

        // Cleanup old signals (older than 10 minutes)
        buffer.cleanup_old_signals(Duration::minutes(10));
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
        for signal in &recent_signals {
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

        // Apply temporal proximity bonus for calendar events
        let temporal_bonus = match current_signal {
            MeetingSignal::CalendarEvent(event_id) => {
                // Calculate actual time proximity to event start
                if let Ok(events) = self.current_events.lock() {
                    if let Some(event) = events.iter().find(|e| &e.id == event_id) {
                        let now = Utc::now();
                        let time_diff = (now - event.start_date).num_minutes().abs();

                        match time_diff {
                            0..=2 => 0.25,  // Very close to start time - highest bonus
                            3..=5 => 0.2,   // Close to start time
                            6..=10 => 0.15, // Nearby start time
                            11..=15 => 0.1, // Within reasonable window
                            _ => 0.05,      // Default small bonus for calendar events
                        }
                    } else {
                        0.05 // Small bonus if event not found but still calendar signal
                    }
                } else {
                    0.05 // Small bonus if can't access events
                }
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
    fn get_recent_signals(&self, duration: Duration) -> Vec<MeetingSignal> {
        let buffer = self
            .signal_buffer
            .lock()
            .expect("Failed to acquire signal buffer lock");
        buffer.get_recent_signals(duration)
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
    fn trigger_auto_recording(
        &self,
        app_handle: tauri::AppHandle<tauri::Wry>,
        score: &MeetingScore,
    ) {
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
        detector.set_auto_record_config(true, 0.0);
        detector.set_auto_record_config(true, 0.5);
        detector.set_auto_record_config(true, 1.0);
        detector.set_auto_record_config(false, 0.7);
    }

    #[test]
    #[should_panic(expected = "Invalid threshold")]
    fn test_set_auto_record_config_invalid_below_range() {
        let detector = MeetingDetector::default();
        detector.set_auto_record_config(true, -0.1);
    }

    #[test]
    #[should_panic(expected = "Invalid threshold")]
    fn test_set_auto_record_config_invalid_above_range() {
        let detector = MeetingDetector::default();
        detector.set_auto_record_config(true, 1.1);
    }

    #[test]
    #[should_panic(expected = "Invalid threshold")]
    fn test_set_auto_record_config_invalid_nan() {
        let detector = MeetingDetector::default();
        detector.set_auto_record_config(true, f64::NAN);
    }

    #[test]
    fn test_set_auto_record_config_updates_state() {
        let detector = MeetingDetector::default();

        // Set configuration and verify state is updated
        detector.set_auto_record_config(true, 0.8);
        assert_eq!(*detector.auto_record_enabled.lock().unwrap(), true);
        assert_eq!(*detector.auto_record_threshold.lock().unwrap(), 0.8);

        // Update configuration and verify state changes
        detector.set_auto_record_config(false, 0.5);
        assert_eq!(*detector.auto_record_enabled.lock().unwrap(), false);
        assert_eq!(*detector.auto_record_threshold.lock().unwrap(), 0.5);
    }
}
