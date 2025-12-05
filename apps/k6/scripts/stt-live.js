import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";
import ws from "k6/ws";

const FLY_ORG = __ENV.FLY_ORG || "";
const FLY_APP = __ENV.FLY_APP || "";
const FLY_TOKEN = __ENV.FLY_TOKEN || "";

const GITHUB_RUN_ID = __ENV.GITHUB_RUN_ID || "";
const GITHUB_REPOSITORY = __ENV.GITHUB_REPOSITORY || "";

const wsConnections = new Counter("ws_connections");
const wsTranscripts = new Counter("ws_transcripts_received");
const wsErrors = new Counter("ws_errors");
const wsReconnects = new Counter("ws_reconnects");
const wsConnectionDuration = new Trend("ws_connection_duration");
const wsFirstTranscriptLatency = new Trend("ws_first_transcript_latency");
const wsConnectionSuccess = new Rate("ws_connection_success");

const TEST_DURATION = __ENV.TEST_DURATION || "1h";
const VUS = parseInt(__ENV.VUS) || 30;

export const options = {
  stages: [
    { duration: "1m", target: VUS },
    { duration: TEST_DURATION, target: VUS },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    ws_connections: ["count > 0"],
    ws_connection_success: ["rate > 0.95"],
    ws_errors: ["count < 50"],
    checks: ["rate > 0.9"],
  },
};

const API_URL = __ENV.API_URL || "ws://localhost:4000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";
const AUDIO_URL = __ENV.AUDIO_URL || "https://dpgr.am/spacewalk.wav";
const CHUNK_SIZE = 4096;
const CHUNK_INTERVAL_MS = 100;
const SESSION_DURATION_MS = 5 * 60 * 1000;

export function setup() {
  const res = http.get(AUDIO_URL, { responseType: "binary" });
  check(res, { "audio fetch successful": (r) => r.status === 200 });
  return { audioData: res.body };
}

function runSession(data) {
  const url = `${API_URL}/listen?provider=deepgram&language=en&encoding=linear16&sample_rate=16000`;
  const params = {
    headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
  };

  const startTime = Date.now();
  let firstTranscriptTime = null;
  let loopCount = 0;
  let connectionOpened = false;

  const res = ws.connect(url, params, function (socket) {
    socket.on("open", () => {
      connectionOpened = true;
      wsConnections.add(1);
      wsConnectionSuccess.add(1);

      const audioBytes = new Uint8Array(data.audioData);
      let offset = 0;

      socket.setInterval(() => {
        if (offset < audioBytes.length) {
          const end = Math.min(offset + CHUNK_SIZE, audioBytes.length);
          const chunk = audioBytes.slice(offset, end);
          socket.sendBinary(chunk.buffer);
          offset = end;
        } else {
          offset = 0;
          loopCount++;
        }
      }, CHUNK_INTERVAL_MS);

      socket.setInterval(() => {
        socket.send(JSON.stringify({ type: "KeepAlive" }));
      }, 3000);
    });

    socket.on("message", (msg) => {
      try {
        const response = JSON.parse(msg);

        if (response.type === "Results") {
          wsTranscripts.add(1);

          if (firstTranscriptTime === null) {
            firstTranscriptTime = Date.now();
            wsFirstTranscriptLatency.add(firstTranscriptTime - startTime);
          }
        }
      } catch (e) {
        // ignore non-JSON messages
      }
    });

    socket.on("error", (e) => {
      if (e.error() !== "websocket: close sent") {
        wsErrors.add(1);
        if (!connectionOpened) {
          wsConnectionSuccess.add(0);
        }
        console.log(`[VU ${__VU}] Error: ${e.error()}`);
      }
    });

    socket.on("close", () => {
      wsConnectionDuration.add(Date.now() - startTime);
    });

    socket.setTimeout(() => {
      socket.send(JSON.stringify({ type: "CloseStream" }));
      socket.close();
    }, SESSION_DURATION_MS);
  });

  if (!connectionOpened) {
    wsConnectionSuccess.add(0);
  }

  check(res, {
    "WebSocket upgrade successful": (r) => r && r.status === 101,
  });

  return connectionOpened;
}

export default function (data) {
  const success = runSession(data);

  if (!success) {
    wsReconnects.add(1);
    sleep(5);
  } else {
    sleep(1);
  }
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `stt-live-${timestamp}.json`;

  const flyMetrics = fetchFlyMetrics(data.state.testRunDurationMs);

  const report = {
    timestamp: new Date().toISOString(),
    duration_ms: data.state.testRunDurationMs,
    vus_max: data.metrics.vus_max?.values?.max || VUS,
    github: GITHUB_RUN_ID
      ? {
          run_id: GITHUB_RUN_ID,
          repository: GITHUB_REPOSITORY,
          url: `https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`,
        }
      : null,
    client: {
      connections: {
        total: data.metrics.ws_connections?.values?.count || 0,
        success_rate: data.metrics.ws_connection_success?.values?.rate || 0,
        errors: data.metrics.ws_errors?.values?.count || 0,
        reconnects: data.metrics.ws_reconnects?.values?.count || 0,
      },
      transcripts: {
        received: data.metrics.ws_transcripts_received?.values?.count || 0,
        first_latency_avg_ms:
          data.metrics.ws_first_transcript_latency?.values?.avg || 0,
        first_latency_p95_ms:
          data.metrics.ws_first_transcript_latency?.values?.["p(95)"] || 0,
      },
      connection_duration: {
        avg_ms: data.metrics.ws_connection_duration?.values?.avg || 0,
        p95_ms: data.metrics.ws_connection_duration?.values?.["p(95)"] || 0,
      },
      checks_passed_rate: data.metrics.checks?.values?.rate || 0,
    },
    server: flyMetrics,
    thresholds: Object.fromEntries(
      Object.entries(data.metrics)
        .filter(([_, v]) => v.thresholds)
        .map(([k, v]) => [
          k,
          { ok: Object.values(v.thresholds).every((t) => t.ok) },
        ]),
    ),
  };

  return {
    stdout: textSummary(report),
    [filename]: JSON.stringify(report, null, 2),
  };
}

function fetchFlyMetrics(durationMs) {
  if (!FLY_ORG || !FLY_APP || !FLY_TOKEN) {
    return { error: "FLY_ORG, FLY_APP, or FLY_TOKEN not set" };
  }

  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - Math.ceil(durationMs / 1000);
  const step = Math.max(60, Math.floor(durationMs / 1000 / 100));

  const queries = {
    cpu_usage: `avg(rate(fly_instance_cpu{app="${FLY_APP}", mode!="idle"}[1m]))`,
    memory_used_bytes: `avg(fly_instance_memory_mem_total{app="${FLY_APP}"} - fly_instance_memory_mem_available{app="${FLY_APP}"})`,
    memory_total_bytes: `avg(fly_instance_memory_mem_total{app="${FLY_APP}"})`,
    concurrency: `avg(fly_app_concurrency{app="${FLY_APP}"})`,
    net_recv_bytes: `sum(increase(fly_instance_net_recv_bytes{app="${FLY_APP}", device="eth0"}[${Math.ceil(durationMs / 1000)}s]))`,
    net_sent_bytes: `sum(increase(fly_instance_net_sent_bytes{app="${FLY_APP}", device="eth0"}[${Math.ceil(durationMs / 1000)}s]))`,
  };

  const baseUrl = `https://api.fly.io/prometheus/${FLY_ORG}/api/v1/query_range`;
  const headers = { Authorization: `Bearer ${FLY_TOKEN}` };

  const results = {};

  for (const [name, query] of Object.entries(queries)) {
    try {
      const url = `${baseUrl}?query=${encodeURIComponent(query)}&start=${startTime}&end=${endTime}&step=${step}`;
      const res = http.get(url, { headers });

      if (res.status === 200) {
        const data = JSON.parse(res.body);
        const values = data.data?.result?.[0]?.values || [];

        if (values.length > 0) {
          const nums = values
            .map((v) => parseFloat(v[1]))
            .filter((n) => !isNaN(n));
          results[name] = {
            avg: nums.reduce((a, b) => a + b, 0) / nums.length,
            max: Math.max(...nums),
            min: Math.min(...nums),
          };
        }
      }
    } catch (e) {
      results[name] = { error: e.message };
    }
  }

  return results;
}

function textSummary(report) {
  const c = report.client;
  const s = report.server;

  const lines = [
    "=== STT WebSocket Stability Test Summary ===",
    "",
    `Duration: ${formatDuration(report.duration_ms)}`,
    `VUs: ${report.vus_max}`,
    "",
    "── Client Metrics ──",
    "Connections:",
    `  Total: ${c.connections.total}`,
    `  Success Rate: ${(c.connections.success_rate * 100).toFixed(2)}%`,
    `  Errors: ${c.connections.errors}`,
    `  Reconnects: ${c.connections.reconnects}`,
    "",
    "Transcripts:",
    `  Received: ${c.transcripts.received}`,
    `  First Latency (avg): ${c.transcripts.first_latency_avg_ms.toFixed(0)}ms`,
    "",
    "Connection Duration:",
    `  Avg: ${formatDuration(c.connection_duration.avg_ms)}`,
    `  P95: ${formatDuration(c.connection_duration.p95_ms)}`,
    "",
    `Checks: ${(c.checks_passed_rate * 100).toFixed(2)}% passed`,
  ];

  if (s && !s.error) {
    lines.push(
      "",
      "── Server Metrics (Fly.io) ──",
      `CPU Usage: avg=${formatPercent(s.cpu_usage?.avg)}, max=${formatPercent(s.cpu_usage?.max)}`,
      `Memory: avg=${formatBytes(s.memory_used_bytes?.avg)}/${formatBytes(s.memory_total_bytes?.avg)}`,
      `Concurrency: avg=${s.concurrency?.avg?.toFixed(1) || "N/A"}, max=${s.concurrency?.max?.toFixed(0) || "N/A"}`,
      `Network: recv=${formatBytes(s.net_recv_bytes?.avg)}, sent=${formatBytes(s.net_sent_bytes?.avg)}`,
    );
  } else if (s?.error) {
    lines.push("", `── Server Metrics: ${s.error} ──`);
  }

  lines.push("");
  return lines.join("\n");
}

function formatDuration(ms) {
  if (!ms) return "0s";
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

function formatPercent(value) {
  if (!value) return "N/A";
  return `${(value * 100).toFixed(2)}%`;
}

function formatBytes(bytes) {
  if (!bytes) return "N/A";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
