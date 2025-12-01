import fs from "fs";
import nock from "nock";
import path from "path";
import { Probot, ProbotOctokit } from "probot";
import { fileURLToPath } from "url";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import myProbotApp from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const privateKey = fs.readFileSync(
  path.join(__dirname, "fixtures/mock-cert.pem"),
  "utf-8",
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
      id: "1",
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
      id: "2",
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
      id: "3",
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
      id: "4",
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
      id: "5",
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

    await probot.receive({
      id: "6",
      name: "check_run",
      payload: otherCheckPayload,
    });

    expect(nock.isDone()).toBe(true);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
