import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Trend } from "k6/metrics";

const completionRequests = new Counter("completion_requests");
const completionSuccess = new Counter("completion_success");
const completionLatency = new Trend("completion_latency");
const streamingTTFB = new Trend("streaming_ttfb");

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    completion_success: ["count > 0"],
    checks: ["rate > 0.9"],
    completion_latency: ["p(95) < 30000"],
  },
};

const API_URL = __ENV.API_URL || "http://localhost:4000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";
const STREAMING = __ENV.STREAMING === "true";

const PROMPTS = {
  short: "What is 2+2?",
  medium:
    "Explain the concept of recursion in programming. Include a simple example and mention common use cases.",
  long: `You are a helpful assistant analyzing a meeting transcript. Here is the context:

The team discussed the following topics:
1. Q3 roadmap planning - focusing on improving user onboarding experience
2. Technical debt reduction - specifically around the authentication system
3. New feature requests from enterprise customers
4. Performance optimization for the real-time collaboration features
5. Integration with third-party calendar services

Based on this context, please provide:
- A summary of the key discussion points
- Action items that should be tracked
- Any decisions that were made
- Recommended follow-up topics for the next meeting

Keep your response concise but comprehensive.`,
};

const PROMPT_KEYS = Object.keys(PROMPTS);

function getRandomPrompt() {
  const key = PROMPT_KEYS[Math.floor(Math.random() * PROMPT_KEYS.length)];
  return { type: key, content: PROMPTS[key] };
}

function makeRequest(prompt, stream) {
  const url = `${API_URL}/chat/completions`;
  const payload = JSON.stringify({
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt.content },
    ],
    stream,
    max_tokens: 256,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
    },
    timeout: "60s",
  };

  const startTime = Date.now();
  const res = http.post(url, payload, params);
  const latency = Date.now() - startTime;

  return { res, latency, promptType: prompt.type };
}

export default function () {
  const prompt = getRandomPrompt();
  completionRequests.add(1);

  const { res, latency, promptType } = makeRequest(prompt, STREAMING);

  const isSuccess = check(res, {
    "status is 200": (r) => r.status === 200,
    "has response body": (r) => r.body && r.body.length > 0,
  });

  if (isSuccess) {
    completionSuccess.add(1);
    completionLatency.add(latency);

    if (STREAMING) {
      streamingTTFB.add(res.timings.waiting);
    }

    console.log(
      `[${promptType}] ${STREAMING ? "stream" : "sync"} completed in ${latency}ms`,
    );
  } else {
    console.log(
      `[${promptType}] failed with status ${res.status}: ${res.body}`,
    );
  }

  sleep(1);
}
