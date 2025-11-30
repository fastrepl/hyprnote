import fs from "fs";
import nock from "nock";
import path from "path";
import { Probot, ProbotOctokit } from "probot";
import { fileURLToPath } from "url";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import myProbotApp from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const privateKey = fs.readFileSync(
  path.join(__dirname, "../../bot/test/fixtures/mock-cert.pem"),
  "utf-8",
);

const payload = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "fixtures/pull_request.closed.json"),
    "utf-8",
  ),
);

describe("GitHub PR closed handler", () => {
  let probot: Probot;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = new Probot({
      appId: 123,
      privateKey,
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    probot.load(myProbotApp);
  });

  test("handles PR closed event without DEVIN_API_KEY", async () => {
    delete process.env.DEVIN_API_KEY;

    await probot.receive({ name: "pull_request", payload });
  });

  test("handles PR closed event with DEVIN_API_KEY but no matching session", async () => {
    process.env.DEVIN_API_KEY = "test-api-key";

    nock("https://api.devin.ai")
      .get("/v1/sessions")
      .query({ limit: "100", offset: "0" })
      .reply(200, { sessions: [] });

    await probot.receive({ name: "pull_request", payload });

    expect(nock.isDone()).toBe(true);
  });

  test("terminates session when matching PR is found", async () => {
    process.env.DEVIN_API_KEY = "test-api-key";

    nock("https://api.devin.ai")
      .get("/v1/sessions")
      .query({ limit: "100", offset: "0" })
      .reply(200, {
        sessions: [
          {
            session_id: "devin-123",
            status: "running",
            title: "Test PR",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:01:00Z",
            snapshot_id: null,
            playbook_id: null,
            pull_request: {
              url: "https://github.com/example/repo/pull/123",
            },
          },
        ],
      });

    nock("https://api.devin.ai")
      .delete("/v1/sessions/devin-123")
      .reply(200, { detail: "Session terminated successfully" });

    await probot.receive({ name: "pull_request", payload });

    expect(nock.isDone()).toBe(true);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    delete process.env.DEVIN_API_KEY;
  });
});
