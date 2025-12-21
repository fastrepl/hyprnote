use futures_util::SinkExt;
use tokio_tungstenite::tungstenite::Message as TungsteniteMessage;

use super::types::UpstreamSender;

pub const MAX_PENDING_QUEUE_BYTES: usize = 5 * 1024 * 1024; // 5 MiB

#[derive(Debug)]
pub enum FlushError {
    SendFailed,
    InvalidUtf8,
}

#[derive(Debug, Clone)]
pub struct QueuedPayload {
    pub data: Vec<u8>,
    pub is_text: bool,
}

#[derive(Default)]
pub struct PendingState {
    control_messages: Vec<QueuedPayload>,
    data_messages: Vec<QueuedPayload>,
    bytes: usize,
}

impl PendingState {
    pub fn enqueue(
        &mut self,
        payload: QueuedPayload,
        is_control: bool,
    ) -> Result<(), &'static str> {
        let size = payload.data.len();
        if size > MAX_PENDING_QUEUE_BYTES {
            return Err("payload_too_large");
        }
        if self.bytes + size > MAX_PENDING_QUEUE_BYTES {
            return Err("backpressure_limit");
        }
        self.bytes += size;
        if is_control {
            self.control_messages.push(payload);
        } else {
            self.data_messages.push(payload);
        }
        Ok(())
    }

    pub async fn flush_to(&mut self, sender: &mut UpstreamSender) -> Result<(), FlushError> {
        // Take ownership of messages, but don't reset bytes yet
        let control = std::mem::take(&mut self.control_messages);
        let data = std::mem::take(&mut self.data_messages);
        let messages: Vec<_> = control.into_iter().chain(data).collect();

        for queued in messages {
            let msg = if queued.is_text {
                match String::from_utf8(queued.data) {
                    Ok(s) => TungsteniteMessage::Text(s.into()),
                    Err(e) => {
                        tracing::warn!("invalid_utf8_in_text_message: {:?}", e);
                        // Reset state since we failed
                        self.bytes = 0;
                        return Err(FlushError::InvalidUtf8);
                    }
                }
            } else {
                TungsteniteMessage::Binary(queued.data.into())
            };
            if sender.send(msg).await.is_err() {
                // Reset state since we failed (remaining messages are lost, but state is consistent)
                self.bytes = 0;
                return Err(FlushError::SendFailed);
            }
        }
        // Only reset bytes after successful flush
        self.bytes = 0;
        Ok(())
    }

    #[cfg(test)]
    pub fn total_bytes(&self) -> usize {
        self.bytes
    }

    #[cfg(test)]
    pub fn drain(&mut self) -> impl Iterator<Item = QueuedPayload> {
        self.bytes = 0;
        std::mem::take(&mut self.control_messages)
            .into_iter()
            .chain(std::mem::take(&mut self.data_messages))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_enqueue_and_drain() {
        let mut state = PendingState::default();

        let payload1 = QueuedPayload {
            data: vec![1, 2, 3],
            is_text: false,
        };
        let payload2 = QueuedPayload {
            data: vec![4, 5],
            is_text: true,
        };

        assert!(state.enqueue(payload1, false).is_ok());
        assert!(state.enqueue(payload2, false).is_ok());
        assert_eq!(state.total_bytes(), 5);

        let drained: Vec<_> = state.drain().collect();
        assert_eq!(drained.len(), 2);
        assert_eq!(state.total_bytes(), 0);
    }

    #[test]
    fn test_control_messages_prioritized() {
        let mut state = PendingState::default();

        let data_payload = QueuedPayload {
            data: b"data".to_vec(),
            is_text: true,
        };
        let control_payload = QueuedPayload {
            data: b"control".to_vec(),
            is_text: true,
        };

        assert!(state.enqueue(data_payload, false).is_ok());
        assert!(state.enqueue(control_payload, true).is_ok());

        let drained: Vec<_> = state.drain().collect();
        assert_eq!(drained.len(), 2);
        assert_eq!(drained[0].data, b"control");
        assert_eq!(drained[1].data, b"data");
    }

    #[test]
    fn test_payload_too_large() {
        let mut state = PendingState::default();

        let large_payload = QueuedPayload {
            data: vec![0; MAX_PENDING_QUEUE_BYTES + 1],
            is_text: false,
        };

        assert_eq!(
            state.enqueue(large_payload, false),
            Err("payload_too_large")
        );
    }

    #[test]
    fn test_backpressure_limit() {
        let mut state = PendingState::default();

        let half_size = MAX_PENDING_QUEUE_BYTES / 2 + 1;
        let payload1 = QueuedPayload {
            data: vec![0; half_size],
            is_text: false,
        };
        let payload2 = QueuedPayload {
            data: vec![0; half_size],
            is_text: false,
        };

        assert!(state.enqueue(payload1, false).is_ok());
        assert_eq!(state.enqueue(payload2, false), Err("backpressure_limit"));
    }
}
