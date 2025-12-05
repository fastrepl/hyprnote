import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Trend } from "k6/metrics";
import ws from "k6/ws";

const wsConnections = new Counter("ws_connections");
const wsTranscripts = new Counter("ws_transcripts_received");
const wsConnectionDuration = new Trend("ws_connection_duration");
const wsFirstTranscriptLatency = new Trend("ws_first_transcript_latency");

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    ws_connections: ["count > 0"],
    checks: ["rate > 0.9"],
  },
};

const API_URL = __ENV.API_URL || "ws://localhost:4000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";
const AUDIO_URL = __ENV.AUDIO_URL || "https://dpgr.am/spacewalk.wav";
const CHUNK_SIZE = 4096;
const CHUNK_INTERVAL_MS = 100;

export function setup() {
  const res = http.get(AUDIO_URL, { responseType: "binary" });
  check(res, { "audio fetch successful": (r) => r.status === 200 });
  return { audioData: res.body };
}

export default function (data) {
  const url = `${API_URL}/listen?provider=deepgram&language=en&encoding=linear16&sample_rate=16000`;
  const params = {
    headers: AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {},
  };

  const startTime = Date.now();
  let firstTranscriptTime = null;
  let audioSendComplete = false;

  const res = ws.connect(url, params, function (socket) {
    socket.on("open", () => {
      wsConnections.add(1);

      const audioBytes = new Uint8Array(data.audioData);
      let offset = 0;

      socket.setInterval(() => {
        if (offset < audioBytes.length) {
          const end = Math.min(offset + CHUNK_SIZE, audioBytes.length);
          const chunk = audioBytes.slice(offset, end);
          socket.sendBinary(chunk.buffer);
          offset = end;
        } else if (!audioSendComplete) {
          audioSendComplete = true;
          socket.send(JSON.stringify({ type: "CloseStream" }));
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

          const transcript =
            response.channel?.alternatives?.[0]?.transcript || "";
          if (transcript && response.is_final) {
            console.log(`[transcript] ${transcript}`);
          }
        } else if (response.type === "Metadata") {
          socket.close();
        }
      } catch (e) {
        // ignore non-JSON messages
      }
    });

    socket.on("error", (e) => {
      if (e.error() !== "websocket: close sent") {
        console.log("Error:", e.error());
      }
    });

    socket.on("close", () => {
      wsConnectionDuration.add(Date.now() - startTime);
    });

    socket.setTimeout(() => {
      socket.send(JSON.stringify({ type: "CloseStream" }));
      socket.close();
    }, 30000);
  });

  check(res, {
    "WebSocket upgrade successful": (r) => r && r.status === 101,
  });

  sleep(1);
}
