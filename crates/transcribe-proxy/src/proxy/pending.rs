pub const MAX_PENDING_QUEUE_BYTES: usize = 5 * 1024 * 1024; // 5 MiB

#[derive(Debug, Clone)]
pub struct QueuedPayload {
    pub data: Vec<u8>,
    pub is_text: bool,
    pub size: usize,
}

pub struct PendingState {
    control_messages: Vec<QueuedPayload>,
    data_messages: Vec<QueuedPayload>,
    bytes: usize,
}

impl PendingState {
    pub fn new() -> Self {
        Self {
            control_messages: Vec::new(),
            data_messages: Vec::new(),
            bytes: 0,
        }
    }

    pub fn enqueue(
        &mut self,
        payload: QueuedPayload,
        is_control: bool,
    ) -> Result<(), &'static str> {
        if payload.size > MAX_PENDING_QUEUE_BYTES {
            return Err("payload_too_large");
        }
        if self.bytes + payload.size > MAX_PENDING_QUEUE_BYTES {
            return Err("backpressure_limit");
        }
        self.bytes += payload.size;
        if is_control {
            self.control_messages.push(payload);
        } else {
            self.data_messages.push(payload);
        }
        Ok(())
    }

    pub fn drain(&mut self) -> Vec<QueuedPayload> {
        let mut to_send =
            Vec::with_capacity(self.control_messages.len() + self.data_messages.len());
        while !self.control_messages.is_empty() || !self.data_messages.is_empty() {
            let queued = if !self.control_messages.is_empty() {
                self.control_messages.remove(0)
            } else {
                self.data_messages.remove(0)
            };
            self.bytes = self.bytes.saturating_sub(queued.size);
            to_send.push(queued);
        }
        to_send
    }

    #[cfg(test)]
    pub fn total_bytes(&self) -> usize {
        self.bytes
    }
}

impl Default for PendingState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_enqueue_and_drain() {
        let mut state = PendingState::new();

        let payload1 = QueuedPayload {
            data: vec![1, 2, 3],
            is_text: false,
            size: 3,
        };
        let payload2 = QueuedPayload {
            data: vec![4, 5],
            is_text: true,
            size: 2,
        };

        assert!(state.enqueue(payload1, false).is_ok());
        assert!(state.enqueue(payload2, false).is_ok());
        assert_eq!(state.total_bytes(), 5);

        let drained = state.drain();
        assert_eq!(drained.len(), 2);
        assert_eq!(state.total_bytes(), 0);
    }

    #[test]
    fn test_control_messages_prioritized() {
        let mut state = PendingState::new();

        let data_payload = QueuedPayload {
            data: b"data".to_vec(),
            is_text: true,
            size: 4,
        };
        let control_payload = QueuedPayload {
            data: b"control".to_vec(),
            is_text: true,
            size: 7,
        };

        assert!(state.enqueue(data_payload, false).is_ok());
        assert!(state.enqueue(control_payload, true).is_ok());

        let drained = state.drain();
        assert_eq!(drained.len(), 2);
        assert_eq!(drained[0].data, b"control");
        assert_eq!(drained[1].data, b"data");
    }

    #[test]
    fn test_payload_too_large() {
        let mut state = PendingState::new();

        let large_payload = QueuedPayload {
            data: vec![0; MAX_PENDING_QUEUE_BYTES + 1],
            is_text: false,
            size: MAX_PENDING_QUEUE_BYTES + 1,
        };

        assert_eq!(
            state.enqueue(large_payload, false),
            Err("payload_too_large")
        );
    }

    #[test]
    fn test_backpressure_limit() {
        let mut state = PendingState::new();

        let half_size = MAX_PENDING_QUEUE_BYTES / 2 + 1;
        let payload1 = QueuedPayload {
            data: vec![0; half_size],
            is_text: false,
            size: half_size,
        };
        let payload2 = QueuedPayload {
            data: vec![0; half_size],
            is_text: false,
            size: half_size,
        };

        assert!(state.enqueue(payload1, false).is_ok());
        assert_eq!(state.enqueue(payload2, false), Err("backpressure_limit"));
    }
}
