use chrono::{DateTime, Duration, Utc};
use hypr_db_user::{Event, ListEventFilter, ListEventFilterCommon, ListEventFilterSpecific};
use regex::Regex;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
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
}

impl Default for MeetingDetector {
    fn default() -> Self {
        let (signal_tx, signal_rx) = mpsc::unbounded_channel();
        Self {
            signals: Arc::new(Mutex::new(HashMap::new())),
            signal_tx,
            signal_rx: Arc::new(Mutex::new(signal_rx)),
        }
    }
}

impl MeetingDetector {
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
}
