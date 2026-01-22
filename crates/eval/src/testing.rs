//! Testing utilities for the eval crate.
//!
//! This module provides mock implementations for testing evaluation logic
//! without making actual API calls.

#![allow(dead_code)]

use std::sync::{Arc, Mutex};

use crate::client::{ChatChoice, ChatChoiceMessage};
use crate::{
    ChatCompleter, ChatCompletionRequest, ChatCompletionResponse, ClientError, GraderResponse,
    Usage, UsageResolver,
};

/// A mock client for testing that returns predefined responses.
#[derive(Debug, Clone)]
pub struct MockClient {
    responses: Arc<Mutex<Vec<MockResponse>>>,
    call_count: Arc<Mutex<usize>>,
    requests: Arc<Mutex<Vec<ChatCompletionRequest>>>,
}

/// A predefined response for the mock client.
#[derive(Debug, Clone)]
pub struct MockResponse {
    pub content: String,
    pub id: String,
}

impl MockResponse {
    /// Creates a new mock response with the given content.
    pub fn new(content: impl Into<String>) -> Self {
        Self {
            content: content.into(),
            id: format!("mock-gen-{}", uuid_v4()),
        }
    }

    /// Creates a new mock response with a specific ID.
    pub fn with_id(content: impl Into<String>, id: impl Into<String>) -> Self {
        Self {
            content: content.into(),
            id: id.into(),
        }
    }

    /// Creates a mock grader response that passes.
    pub fn grader_pass(reasoning: impl Into<String>) -> Self {
        let response = GraderResponse {
            verdict: "PASS".to_string(),
            reasoning: reasoning.into(),
        };
        Self::new(serde_json::to_string(&response).unwrap())
    }

    /// Creates a mock grader response that fails.
    pub fn grader_fail(reasoning: impl Into<String>) -> Self {
        let response = GraderResponse {
            verdict: "FAIL".to_string(),
            reasoning: reasoning.into(),
        };
        Self::new(serde_json::to_string(&response).unwrap())
    }
}

impl Default for MockClient {
    fn default() -> Self {
        Self::new()
    }
}

impl MockClient {
    /// Creates a new mock client with no predefined responses.
    pub fn new() -> Self {
        Self {
            responses: Arc::new(Mutex::new(Vec::new())),
            call_count: Arc::new(Mutex::new(0)),
            requests: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// Creates a mock client that returns the same response for all requests.
    pub fn with_response(response: MockResponse) -> Self {
        let client = Self::new();
        client.add_response(response);
        client
    }

    /// Creates a mock client that returns multiple responses in sequence.
    pub fn with_responses(responses: Vec<MockResponse>) -> Self {
        let client = Self::new();
        for response in responses {
            client.add_response(response);
        }
        client
    }

    /// Adds a response to the queue.
    pub fn add_response(&self, response: MockResponse) {
        self.responses.lock().unwrap().push(response);
    }

    /// Returns the number of times the client was called.
    pub fn call_count(&self) -> usize {
        *self.call_count.lock().unwrap()
    }

    /// Returns all requests that were made to the client.
    pub fn requests(&self) -> Vec<ChatCompletionRequest> {
        self.requests.lock().unwrap().clone()
    }

    /// Resets the call count and request history.
    pub fn reset(&self) {
        *self.call_count.lock().unwrap() = 0;
        self.requests.lock().unwrap().clear();
    }
}

impl ChatCompleter for MockClient {
    fn create_chat_completion(
        &self,
        request: &ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, ClientError> {
        // Record the request
        self.requests.lock().unwrap().push(request.clone());

        // Increment call count
        let mut count = self.call_count.lock().unwrap();
        let current_count = *count;
        *count += 1;
        drop(count);

        // Get the response (cycle through if we run out)
        let responses = self.responses.lock().unwrap();
        if responses.is_empty() {
            return Err(ClientError::model_error(
                &request.model,
                "No mock responses configured",
            ));
        }

        let response = &responses[current_count % responses.len()];
        let n = request.n.unwrap_or(1) as usize;

        let choices: Vec<ChatChoice> = (0..n)
            .map(|_| ChatChoice {
                message: ChatChoiceMessage {
                    content: response.content.clone(),
                },
            })
            .collect();

        Ok(ChatCompletionResponse {
            id: response.id.clone(),
            choices,
        })
    }
}

impl UsageResolver for MockClient {
    fn get_generation_usage(&self, _generation_id: &str) -> Result<Usage, ClientError> {
        Ok(Usage {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
            cost: 0.001,
        })
    }
}

/// Generates a simple UUID v4-like string for mock IDs.
fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("{:032x}", timestamp)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_client_basic() {
        let client = MockClient::with_response(MockResponse::new("Hello, world!"));

        let request = ChatCompletionRequest {
            model: "test-model".to_string(),
            messages: vec![],
            temperature: None,
            n: None,
            response_format: None,
        };

        let response = client.create_chat_completion(&request).unwrap();
        assert_eq!(response.choices[0].message.content, "Hello, world!");
        assert_eq!(client.call_count(), 1);
    }

    #[test]
    fn test_mock_client_multiple_responses() {
        let client = MockClient::with_responses(vec![
            MockResponse::new("First"),
            MockResponse::new("Second"),
        ]);

        let request = ChatCompletionRequest {
            model: "test-model".to_string(),
            messages: vec![],
            temperature: None,
            n: None,
            response_format: None,
        };

        let r1 = client.create_chat_completion(&request).unwrap();
        let r2 = client.create_chat_completion(&request).unwrap();
        let r3 = client.create_chat_completion(&request).unwrap();

        assert_eq!(r1.choices[0].message.content, "First");
        assert_eq!(r2.choices[0].message.content, "Second");
        assert_eq!(r3.choices[0].message.content, "First"); // Cycles back
        assert_eq!(client.call_count(), 3);
    }

    #[test]
    fn test_mock_client_grader_responses() {
        let client = MockClient::with_response(MockResponse::grader_pass("Looks good!"));

        let request = ChatCompletionRequest {
            model: "test-model".to_string(),
            messages: vec![],
            temperature: None,
            n: None,
            response_format: None,
        };

        let response = client.create_chat_completion(&request).unwrap();
        let grader: GraderResponse =
            serde_json::from_str(&response.choices[0].message.content).unwrap();

        assert_eq!(grader.verdict, "PASS");
        assert_eq!(grader.reasoning, "Looks good!");
    }

    #[test]
    fn test_mock_client_tracks_requests() {
        let client = MockClient::with_response(MockResponse::new("Response"));

        let request = ChatCompletionRequest {
            model: "gpt-4".to_string(),
            messages: vec![],
            temperature: Some(0.5),
            n: None,
            response_format: None,
        };

        client.create_chat_completion(&request).unwrap();

        let requests = client.requests();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0].model, "gpt-4");
        assert_eq!(requests[0].temperature, Some(0.5));
    }

    #[test]
    fn test_mock_client_no_responses_error() {
        let client = MockClient::new();

        let request = ChatCompletionRequest {
            model: "test-model".to_string(),
            messages: vec![],
            temperature: None,
            n: None,
            response_format: None,
        };

        let result = client.create_chat_completion(&request);
        assert!(result.is_err());
    }
}
