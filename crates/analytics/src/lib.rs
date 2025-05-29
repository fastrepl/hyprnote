use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};
use chrono::{DateTime, Utc};

use omniqueue::{MemoryBackend, QueueConsumer, QueueProducer};

mod error;
pub use error::*;

// Maximum number of events to store in the queue
const MAX_QUEUE_SIZE: usize = 100;
// Flush interval in seconds
const FLUSH_INTERVAL_SECS: u64 = 30;

#[derive(Clone)]
pub struct AnalyticsClient {
    client: reqwest::Client,
    api_key: String,
    producer: Arc<Mutex<Box<dyn QueueProducer<Error = omniqueue::Error>>>>,
    consumer: Arc<Mutex<Box<dyn QueueConsumer<Error = omniqueue::Error>>>>,
}

impl AnalyticsClient {
    pub fn new(api_key: impl Into<String>) -> Self {
        let client = reqwest::Client::new();
        let api_key = api_key.into();
        
        // Create a memory backend with the specified capacity
        let (producer, consumer) = MemoryBackend::builder()
            .capacity(MAX_QUEUE_SIZE)
            .build_pair()
            .expect("Failed to create memory queue");
        
        // Wrap in Arc<Mutex<>> for thread-safe sharing
        let producer = Arc::new(Mutex::new(Box::new(producer) as Box<dyn QueueProducer<Error = omniqueue::Error>>));
        let consumer = Arc::new(Mutex::new(Box::new(consumer) as Box<dyn QueueConsumer<Error = omniqueue::Error>>));
        
        let instance = Self {
            client,
            api_key,
            producer,
            consumer,
        };
        
        // Start background task to process the queue
        let instance_clone = instance.clone();
        tokio::spawn(async move {
            instance_clone.background_queue_processor().await;
        });
        
        instance
    }

    pub async fn event(&self, mut payload: AnalyticsPayload) -> Result<(), Error> {
        if cfg!(debug_assertions) {
            return Ok(());
        }

        // Add timestamp if not already present
        if !payload.props.contains_key("timestamp") {
            let now: DateTime<Utc> = SystemTime::now().into();
            payload.props.insert("timestamp".into(), now.to_rfc3339().into());
        }

        // Try to send the event immediately
        match self.send_event(&payload).await {
            Ok(_) => Ok(()),
            Err(e) => {
                // If sending fails, add to queue
                let producer = self.producer.lock().unwrap();
                match producer.send_serde_json(&payload).await {
                    Ok(_) => Err(Error::EventQueued),
                    Err(queue_err) => Err(Error::QueueError(queue_err.to_string())),
                }
            }
        }
    }

    // Helper method to actually send the event to PostHog
    async fn send_event(&self, payload: &AnalyticsPayload) -> Result<(), Error> {
        let mut e = posthog::Event::new(payload.event.clone(), payload.distinct_id.clone());

        for (key, value) in &payload.props {
            let _ = e.insert_prop(key, value.clone());
        }

        let inner_event = posthog_core::event::InnerEvent::new(e, self.api_key.clone());

        self.client
            .post("https://us.i.posthog.com/capture/")
            .json(&inner_event)
            .send()
            .await?
            .error_for_status()?;

        Ok(())
    }

    // Get the current size of the queue
    pub fn get_queue_size(&self) -> usize {
        // Get the size from the producer
        if let Ok(producer) = self.producer.lock() {
            producer.len().unwrap_or(0)
        } else {
            0
        }
    }

    // Clear all events from the queue
    pub fn clear_queue(&self) -> Result<(), Error> {
        // Create a new memory backend to replace the old one
        let (producer, consumer) = MemoryBackend::builder()
            .capacity(MAX_QUEUE_SIZE)
            .build_pair()
            .map_err(|e| Error::QueueError(e.to_string()))?;
        
        // Replace the old producer and consumer
        if let Ok(mut p) = self.producer.lock() {
            *p = Box::new(producer) as Box<dyn QueueProducer<Error = omniqueue::Error>>;
        } else {
            return Err(Error::QueueError("Failed to lock producer".to_string()));
        }
        
        if let Ok(mut c) = self.consumer.lock() {
            *c = Box::new(consumer) as Box<dyn QueueConsumer<Error = omniqueue::Error>>;
        } else {
            return Err(Error::QueueError("Failed to lock consumer".to_string()));
        }
        
        Ok(())
    }

    // Try to flush the queue
    pub async fn flush_queue(&self) -> Result<(), Error> {
        loop {
            // Try to receive a message from the queue (non-blocking)
            let delivery = {
                let consumer = self.consumer.lock().unwrap();
                match consumer.try_receive().await {
                    Ok(Some(delivery)) => delivery,
                    Ok(None) => return Ok(()), // Queue is empty
                    Err(e) => return Err(Error::QueueError(e.to_string())),
                }
            };
            
            // Deserialize the payload
            let payload = match delivery.payload_serde_json::<AnalyticsPayload>().await {
                Ok(Some(payload)) => payload,
                _ => {
                    // Invalid payload, acknowledge and continue
                    let _ = delivery.ack().await;
                    continue;
                }
            };
            
            // Try to send the event
            match self.send_event(&payload).await {
                Ok(_) => {
                    // Successfully sent, acknowledge the message
                    if let Err(e) = delivery.ack().await {
                        return Err(Error::QueueError(e.to_string()));
                    }
                }
                Err(e) => {
                    // Failed to send, reject the message (it will be requeued)
                    let _ = delivery.reject().await;
                    return Err(e);
                }
            }
        }
    }

    // Background task to process the queue periodically
    async fn background_queue_processor(&self) {
        loop {
            // Sleep for the flush interval
            tokio::time::sleep(Duration::from_secs(FLUSH_INTERVAL_SECS)).await;
            
            // Try to flush the queue
            if let Err(e) = self.flush_queue().await {
                // Log errors but continue processing
                eprintln!("Error flushing analytics queue: {}", e);
            }
        }
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type, Clone)]
pub struct AnalyticsPayload {
    event: String,
    distinct_id: String,
    #[serde(flatten)]
    pub props: HashMap<String, serde_json::Value>,
}

#[derive(Clone)]
pub struct AnalyticsPayloadBuilder {
    event: Option<String>,
    distinct_id: String,
    props: HashMap<String, serde_json::Value>,
}

impl AnalyticsPayload {
    pub fn for_user(user_id: impl Into<String>) -> AnalyticsPayloadBuilder {
        AnalyticsPayloadBuilder {
            event: None,
            distinct_id: user_id.into(),
            props: HashMap::new(),
        }
    }
}

impl AnalyticsPayloadBuilder {
    pub fn event(mut self, name: impl Into<String>) -> Self {
        self.event = Some(name.into());
        self
    }

    pub fn with(mut self, key: impl Into<String>, value: impl Into<serde_json::Value>) -> Self {
        self.props.insert(key.into(), value.into());
        self
    }

    pub fn build(self) -> AnalyticsPayload {
        if self.event.is_none() {
            panic!("'Event' is not specified");
        }

        // Add timestamp if not already present
        let mut props = self.props;
        if !props.contains_key("timestamp") {
            let now: DateTime<Utc> = SystemTime::now().into();
            props.insert("timestamp".into(), now.to_rfc3339().into());
        }

        AnalyticsPayload {
            event: self.event.unwrap(),
            distinct_id: self.distinct_id,
            props,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[ignore]
    #[tokio::test]
    async fn test_analytics() {
        let client = AnalyticsClient::new("");
        let payload = AnalyticsPayload::for_user("user_id_123")
            .event("test_event")
            .with("key1", "value1")
            .with("key2", 2)
            .build();

        client.event(payload).await.unwrap();
    }
}
