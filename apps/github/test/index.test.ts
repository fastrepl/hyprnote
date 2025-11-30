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

const checkRunCreatedPayload = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "fixtures/check_run.created.json"),
    "utf-8",
  ),
);

const checkRunCompletedSuccessPayload = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "fixtures/check_run.completed.success.json"),
    "utf-8",
  ),
);

const checkRunCompletedFailurePayload = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "fixtures/check_run.completed.failure.json"),
    "utf-8",
  ),
);

const pullRequestOpenedPayload = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "fixtures/pull_request.opened.json"),
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

  test("finds session on second page when paginating", async () => {
    process.env.DEVIN_API_KEY = "test-api-key";

    const sessionsPage1 = Array.from({ length: 100 }, (_, i) => ({
      session_id: `devin-other-${i}`,
      status: "running",
      title: `Other PR ${i}`,
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:01:00Z",
      snapshot_id: null,
      playbook_id: null,
      pull_request: {
        url: `https://github.com/example/repo/pull/${i + 200}`,
      },
    }));

    nock("https://api.devin.ai")
      .get("/v1/sessions")
      .query({ limit: "100", offset: "0" })
      .reply(200, { sessions: sessionsPage1 });

    nock("https://api.devin.ai")
      .get("/v1/sessions")
      .query({ limit: "100", offset: "100" })
      .reply(200, {
        sessions: [
          {
            session_id: "devin-target",
            status: "running",
            title: "Target PR",
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
      .delete("/v1/sessions/devin-target")
      .reply(200, { detail: "Session terminated successfully" });

    await probot.receive({ name: "pull_request", payload });

    expect(nock.isDone()).toBe(true);
  });

  test("finds session when sessions are returned in non-chronological order", async () => {
    process.env.DEVIN_API_KEY = "test-api-key";

    nock("https://api.devin.ai")
      .get("/v1/sessions")
      .query({ limit: "100", offset: "0" })
      .reply(200, {
        sessions: [
          {
            session_id: "devin-old",
            status: "running",
            title: "Old PR",
            created_at: "2023-12-01T00:00:00Z",
            updated_at: "2023-12-01T00:01:00Z",
            snapshot_id: null,
            playbook_id: null,
            pull_request: {
              url: "https://github.com/example/repo/pull/100",
            },
          },
          {
            session_id: "devin-target",
            status: "running",
            title: "Target PR",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:01:00Z",
            snapshot_id: null,
            playbook_id: null,
            pull_request: {
              url: "https://github.com/example/repo/pull/123",
            },
          },
          {
            session_id: "devin-newer",
            status: "running",
            title: "Newer PR",
            created_at: "2024-02-01T00:00:00Z",
            updated_at: "2024-02-01T00:01:00Z",
            snapshot_id: null,
            playbook_id: null,
            pull_request: {
              url: "https://github.com/example/repo/pull/150",
            },
          },
        ],
      });

    nock("https://api.devin.ai")
      .delete("/v1/sessions/devin-target")
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

describe("bot_ci check handler", () => {
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

  test("creates in_progress check when bot_ci is created", async () => {
    nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, { token: "test-token", permissions: { checks: "write" } });
    nock("https://api.github.com")
      .get("/repos/hiimbex/testing-things/commits/abc123/check-runs")
      .query({ check_name: "bot_ci" })
      .reply(200, {
        total_count: 1,
        check_runs: [
          {
            id: 1,
            name: "bot_ci",
            status: "in_progress",
            conclusion: null,
          },
        ],
      });

    nock("https://api.github.com")
      .get("/repos/hiimbex/testing-things/commits/abc123/check-runs")
      .query({ check_name: "Mergeable: bot_ci" })
      .reply(200, { total_count: 0, check_runs: [] });

    nock("https://api.github.com")
      .post("/repos/hiimbex/testing-things/check-runs", (body) => {
        expect(body.name).toBe("Mergeable: bot_ci");
        expect(body.status).toBe("in_progress");
        expect(body.output.title).toBe("Waiting for bot_ci to complete");
        return true;
      })
      .reply(201, { id: 2 });

    await probot.receive({
      name: "check_run",
      payload: checkRunCreatedPayload,
    });

    expect(nock.isDone()).toBe(true);
  });

  test("creates success check when bot_ci completes successfully", async () => {
    nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, { token: "test-token", permissions: { checks: "write" } });

    nock("https://api.github.com")
      .get("/repos/hiimbex/testing-things/commits/abc123/check-runs")
      .query({ check_name: "bot_ci" })
      .reply(200, {
        total_count: 1,
        check_runs: [
          {
            id: 1,
            name: "bot_ci",
            status: "completed",
            conclusion: "success",
          },
        ],
      });

    nock("https://api.github.com")
      .get("/repos/hiimbex/testing-things/commits/abc123/check-runs")
      .query({ check_name: "Mergeable: bot_ci" })
      .reply(200, { total_count: 0, check_runs: [] });

    nock("https://api.github.com")
      .post("/repos/hiimbex/testing-things/check-runs", (body) => {
        expect(body.name).toBe("Mergeable: bot_ci");
        expect(body.status).toBe("completed");
        expect(body.conclusion).toBe("success");
        expect(body.output.title).toBe("bot_ci passed");
        return true;
      })
      .reply(201, { id: 2 });

    await probot.receive({
      name: "check_run",
      payload: checkRunCompletedSuccessPayload,
    });

    expect(nock.isDone()).toBe(true);
  });

  test("creates failure check when bot_ci fails", async () => {
    nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, { token: "test-token", permissions: { checks: "write" } });

    nock("https://api.github.com")
      .get("/repos/hiimbex/testing-things/commits/abc123/check-runs")
      .query({ check_name: "bot_ci" })
      .reply(200, {
        total_count: 1,
        check_runs: [
          {
            id: 1,
            name: "bot_ci",
            status: "completed",
            conclusion: "failure",
          },
        ],
      });

    nock("https://api.github.com")
      .get("/repos/hiimbex/testing-things/commits/abc123/check-runs")
      .query({ check_name: "Mergeable: bot_ci" })
      .reply(200, { total_count: 0, check_runs: [] });

    nock("https://api.github.com")
      .post("/repos/hiimbex/testing-things/check-runs", (body) => {
        expect(body.name).toBe("Mergeable: bot_ci");
        expect(body.status).toBe("completed");
        expect(body.conclusion).toBe("failure");
        expect(body.output.title).toBe("bot_ci failure");
        return true;
      })
      .reply(201, { id: 2 });

    await probot.receive({
      name: "check_run",
      payload: checkRunCompletedFailurePayload,
    });

    expect(nock.isDone()).toBe(true);
  });

  test("creates success check when bot_ci is not triggered on PR open", async () => {
    nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, { token: "test-token", permissions: { checks: "write" } });

    nock("https://api.github.com")
      .get("/repos/hiimbex/testing-things/commits/abc123/check-runs")
      .query({ check_name: "bot_ci" })
      .reply(200, { total_count: 0, check_runs: [] });

    nock("https://api.github.com")
      .get("/repos/hiimbex/testing-things/commits/abc123/check-runs")
      .query({ check_name: "Mergeable: bot_ci" })
      .reply(200, { total_count: 0, check_runs: [] });

    nock("https://api.github.com")
      .post("/repos/hiimbex/testing-things/check-runs", (body) => {
        expect(body.name).toBe("Mergeable: bot_ci");
        expect(body.status).toBe("completed");
        expect(body.conclusion).toBe("success");
        expect(body.output.title).toBe("bot_ci not triggered");
        return true;
      })
      .reply(201, { id: 2 });

    await probot.receive({
      name: "pull_request",
      payload: pullRequestOpenedPayload,
    });

    expect(nock.isDone()).toBe(true);
  });

  test("updates existing check instead of creating new one", async () => {
    nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, { token: "test-token", permissions: { checks: "write" } });

    nock("https://api.github.com")
      .get("/repos/hiimbex/testing-things/commits/abc123/check-runs")
      .query({ check_name: "bot_ci" })
      .reply(200, {
        total_count: 1,
        check_runs: [
          {
            id: 1,
            name: "bot_ci",
            status: "completed",
            conclusion: "success",
          },
        ],
      });

    nock("https://api.github.com")
      .get("/repos/hiimbex/testing-things/commits/abc123/check-runs")
      .query({ check_name: "Mergeable: bot_ci" })
      .reply(200, {
        total_count: 1,
        check_runs: [{ id: 2, name: "Mergeable: bot_ci" }],
      });

    nock("https://api.github.com")
      .patch("/repos/hiimbex/testing-things/check-runs/2", (body) => {
        expect(body.status).toBe("completed");
        expect(body.conclusion).toBe("success");
        return true;
      })
      .reply(200, { id: 2 });

    await probot.receive({
      name: "check_run",
      payload: checkRunCompletedSuccessPayload,
    });

    expect(nock.isDone()).toBe(true);
  });

  test("ignores check_run events for non-bot_ci checks", async () => {
    const otherCheckPayload = {
      ...checkRunCreatedPayload,
      check_run: {
        ...checkRunCreatedPayload.check_run,
        name: "other_check",
      },
    };

    await probot.receive({ name: "check_run", payload: otherCheckPayload });

    expect(nock.isDone()).toBe(true);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
