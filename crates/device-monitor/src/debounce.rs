use std::collections::VecDeque;
use std::sync::mpsc;
use std::time::{Duration, Instant};

use crate::DeviceSwitch;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum SwitchKind {
    DefaultInputChanged,
    DefaultOutputChanged,
}

impl From<&DeviceSwitch> for SwitchKind {
    fn from(switch: &DeviceSwitch) -> Self {
        match switch {
            DeviceSwitch::DefaultInputChanged => SwitchKind::DefaultInputChanged,
            DeviceSwitch::DefaultOutputChanged { .. } => SwitchKind::DefaultOutputChanged,
        }
    }
}

struct PendingEvent {
    event: DeviceSwitch,
    release_at: Instant,
}

pub struct EventBuffer {
    delay: Duration,
    events: VecDeque<PendingEvent>,
}

pub enum State {
    Ready(DeviceSwitch),
    Wait(Duration),
    Empty,
}

impl EventBuffer {
    pub fn new(delay: Duration) -> Self {
        Self {
            delay,
            events: VecDeque::new(),
        }
    }

    pub fn put(&mut self, event: DeviceSwitch) {
        let now = Instant::now();
        let kind = SwitchKind::from(&event);

        self.events
            .retain(|e| e.release_at <= now || SwitchKind::from(&e.event) != kind);

        self.events.push_back(PendingEvent {
            event,
            release_at: now + self.delay,
        });
    }

    pub fn get(&mut self) -> State {
        let now = Instant::now();
        match self.events.front() {
            None => State::Empty,
            Some(e) if e.release_at > now => State::Wait(e.release_at - now),
            Some(_) => State::Ready(self.events.pop_front().unwrap().event),
        }
    }
}

pub fn spawn_debounced(
    delay: Duration,
    raw_rx: mpsc::Receiver<DeviceSwitch>,
    debounced_tx: mpsc::Sender<DeviceSwitch>,
) {
    std::thread::spawn(move || {
        let mut buffer = EventBuffer::new(delay);

        loop {
            let timeout = match buffer.get() {
                State::Ready(event) => {
                    let _ = debounced_tx.send(event);
                    continue;
                }
                State::Wait(duration) => duration,
                State::Empty => Duration::from_secs(60),
            };

            match raw_rx.recv_timeout(timeout) {
                Ok(event) => {
                    buffer.put(event);
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    continue;
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    while let State::Ready(event) = buffer.get() {
                        let _ = debounced_tx.send(event);
                    }
                    break;
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn test_event_buffer_wait() {
        let mut buffer = EventBuffer::new(Duration::from_millis(20));
        buffer.put(DeviceSwitch::DefaultInputChanged);
        assert!(matches!(buffer.get(), State::Wait(_)));
        thread::sleep(Duration::from_millis(10));
        assert!(matches!(buffer.get(), State::Wait(_)));
        thread::sleep(Duration::from_millis(15));
        assert!(matches!(buffer.get(), State::Ready(_)));
    }

    #[test]
    fn test_event_buffer_deduplication() {
        let mut buffer = EventBuffer::new(Duration::from_millis(20));
        buffer.put(DeviceSwitch::DefaultInputChanged);
        buffer.put(DeviceSwitch::DefaultOutputChanged { headphone: false });
        thread::sleep(Duration::from_millis(10));
        buffer.put(DeviceSwitch::DefaultInputChanged);
        thread::sleep(Duration::from_millis(25));

        let mut results = Vec::new();
        while let State::Ready(event) = buffer.get() {
            results.push(event);
        }

        assert_eq!(results.len(), 2);
        assert!(matches!(
            results[0],
            DeviceSwitch::DefaultOutputChanged { .. }
        ));
        assert!(matches!(results[1], DeviceSwitch::DefaultInputChanged));
    }

    #[test]
    fn test_event_buffer_different_events_not_deduplicated() {
        let mut buffer = EventBuffer::new(Duration::from_millis(20));
        buffer.put(DeviceSwitch::DefaultInputChanged);
        buffer.put(DeviceSwitch::DefaultOutputChanged { headphone: true });
        thread::sleep(Duration::from_millis(25));

        let mut results = Vec::new();
        while let State::Ready(event) = buffer.get() {
            results.push(event);
        }

        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_spawn_debounced() {
        let (raw_tx, raw_rx) = mpsc::channel();
        let (debounced_tx, debounced_rx) = mpsc::channel();

        spawn_debounced(Duration::from_millis(50), raw_rx, debounced_tx);

        raw_tx.send(DeviceSwitch::DefaultInputChanged).unwrap();
        raw_tx.send(DeviceSwitch::DefaultInputChanged).unwrap();
        raw_tx.send(DeviceSwitch::DefaultInputChanged).unwrap();

        thread::sleep(Duration::from_millis(100));

        let results: Vec<_> = debounced_rx.try_iter().collect();
        assert_eq!(results.len(), 1);
        assert!(matches!(results[0], DeviceSwitch::DefaultInputChanged));
    }

    #[test]
    fn test_spawn_debounced_preserves_latest_payload() {
        let (raw_tx, raw_rx) = mpsc::channel();
        let (debounced_tx, debounced_rx) = mpsc::channel();

        spawn_debounced(Duration::from_millis(50), raw_rx, debounced_tx);

        raw_tx
            .send(DeviceSwitch::DefaultOutputChanged { headphone: false })
            .unwrap();
        raw_tx
            .send(DeviceSwitch::DefaultOutputChanged { headphone: true })
            .unwrap();

        thread::sleep(Duration::from_millis(100));

        let results: Vec<_> = debounced_rx.try_iter().collect();
        assert_eq!(results.len(), 1);
        assert!(matches!(
            results[0],
            DeviceSwitch::DefaultOutputChanged { headphone: true }
        ));
    }
}
