import { ApplicationFunctionOptions, Probot } from "probot";

const BOT_CI_CHECK_NAME = "bot_ci";
const MERGEABLE_CHECK_NAME = "Mergeable: bot_ci";

interface CheckRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
}

interface DevinSession {
  session_id: string;
  status: string;
  title: string;
  created_at: string;
  updated_at: string;
  snapshot_id: string | null;
  playbook_id: string | null;
  pull_request: {
    url: string;
  } | null;
}

interface ListSessionsResponse {
  sessions: DevinSession[];
}

async function listDevinSessions(
  apiKey: string,
  limit: number = 100,
  offset: number = 0,
): Promise<ListSessionsResponse> {
  const url = new URL("https://api.devin.ai/v1/sessions");
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("offset", offset.toString());

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to list sessions: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<ListSessionsResponse>;
}

async function terminateDevinSession(
  apiKey: string,
  sessionId: string,
): Promise<void> {
  const response = await fetch(
    `https://api.devin.ai/v1/sessions/${sessionId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to terminate session: ${response.status} ${response.statusText}`,
    );
  }
}

async function findDevinSessionForPR(
  apiKey: string,
  prUrl: string,
): Promise<DevinSession | null> {
  const limit = 100;
  let offset = 0;
  const maxIterations = 50;

  for (let i = 0; i < maxIterations; i++) {
    const { sessions } = await listDevinSessions(apiKey, limit, offset);

    if (sessions.length === 0) {
      break;
    }

    const sorted = [...sessions].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const match = sorted.find((s) => s.pull_request?.url === prUrl);
    if (match) {
      return match;
    }

    if (sessions.length < limit) {
      break;
    }

    offset += limit;
  }

  return null;
}

async function getBotCiCheckRun(
  context: Parameters<Parameters<Probot["on"]>[1]>[0],
  owner: string,
  repo: string,
  ref: string,
): Promise<CheckRun | null> {
  const { data } = await context.octokit.checks.listForRef({
    owner,
    repo,
    ref,
    check_name: BOT_CI_CHECK_NAME,
  });

  if (data.check_runs.length === 0) {
    return null;
  }

  const checkRun = data.check_runs[0];
  return {
    id: checkRun.id,
    name: checkRun.name,
    status: checkRun.status,
    conclusion: checkRun.conclusion,
  };
}

async function createOrUpdateMergeableCheck(
  context: Parameters<Parameters<Probot["on"]>[1]>[0],
  owner: string,
  repo: string,
  headSha: string,
  botCiCheck: CheckRun | null,
): Promise<void> {
  const existingChecks = await context.octokit.checks.listForRef({
    owner,
    repo,
    ref: headSha,
    check_name: MERGEABLE_CHECK_NAME,
  });

  let status: "queued" | "in_progress" | "completed";
  let conclusion:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "action_required"
    | undefined;
  let title: string;
  let summary: string;

  if (botCiCheck === null) {
    status = "completed";
    conclusion = "success";
    title = "bot_ci not triggered";
    summary =
      "The bot_ci check was not triggered for this PR, so merging is allowed.";
  } else if (botCiCheck.status !== "completed") {
    status = "in_progress";
    conclusion = undefined;
    title = "Waiting for bot_ci to complete";
    summary = `The bot_ci check is currently ${botCiCheck.status}. Merging is blocked until it completes successfully.`;
  } else if (botCiCheck.conclusion === "success") {
    status = "completed";
    conclusion = "success";
    title = "bot_ci passed";
    summary = "The bot_ci check has passed. Merging is allowed.";
  } else {
    status = "completed";
    conclusion = "failure";
    title = `bot_ci ${botCiCheck.conclusion || "failed"}`;
    summary = `The bot_ci check has ${botCiCheck.conclusion || "failed"}. Merging is blocked.`;
  }

  if (existingChecks.data.check_runs.length > 0) {
    const existingCheck = existingChecks.data.check_runs[0];
    await context.octokit.checks.update({
      owner,
      repo,
      check_run_id: existingCheck.id,
      status,
      conclusion,
      output: {
        title,
        summary,
      },
    });
  } else {
    await context.octokit.checks.create({
      owner,
      repo,
      name: MERGEABLE_CHECK_NAME,
      head_sha: headSha,
      status,
      conclusion,
      output: {
        title,
        summary,
      },
    });
  }
}

async function handleBotCiCheck(
  context: Parameters<Parameters<Probot["on"]>[1]>[0],
  owner: string,
  repo: string,
  headSha: string,
): Promise<void> {
  const botCiCheck = await getBotCiCheckRun(context, owner, repo, headSha);
  await createOrUpdateMergeableCheck(context, owner, repo, headSha, botCiCheck);
}

export default (app: Probot, { getRouter }: ApplicationFunctionOptions) => {
  if (getRouter) {
    const router = getRouter("/");

    router.get("/health", (_req, res) => {
      res.send("OK");
    });
  }

  app.on(
    ["check_run.created", "check_run.completed", "check_run.rerequested"],
    async (context) => {
      const checkRun = context.payload.check_run;

      if (checkRun.name !== BOT_CI_CHECK_NAME) {
        return;
      }

      const pullRequests = checkRun.pull_requests;
      if (pullRequests.length === 0) {
        context.log.info("No pull requests associated with this check run");
        return;
      }

      const owner = context.payload.repository.owner.login;
      const repo = context.payload.repository.name;
      const headSha = checkRun.head_sha;

      context.log.info(
        `bot_ci check ${context.payload.action} for ${owner}/${repo}@${headSha}`,
      );

      try {
        await handleBotCiCheck(context, owner, repo, headSha);
      } catch (error) {
        context.log.error(`Failed to handle bot_ci check: ${error}`);
      }
    },
  );

  app.on(
    [
      "pull_request.opened",
      "pull_request.synchronize",
      "pull_request.reopened",
    ],
    async (context) => {
      const pr = context.payload.pull_request;
      const owner = context.payload.repository.owner.login;
      const repo = context.payload.repository.name;
      const headSha = pr.head.sha;

      context.log.info(
        `PR ${context.payload.action} for ${owner}/${repo}#${pr.number}`,
      );

      try {
        await handleBotCiCheck(context, owner, repo, headSha);
      } catch (error) {
        context.log.error(`Failed to handle PR event: ${error}`);
      }
    },
  );

  app.on("pull_request.closed", async (context) => {
    const apiKey = process.env.DEVIN_API_KEY;
    if (!apiKey) {
      context.log.warn("DEVIN_API_KEY not set, skipping session termination");
      return;
    }

    const pr = context.payload.pull_request;
    const prUrl = pr.html_url;

    context.log.info(`PR closed: ${prUrl} (merged: ${pr.merged})`);

    try {
      const session = await findDevinSessionForPR(apiKey, prUrl);

      if (!session) {
        context.log.info(`No Devin session found for PR: ${prUrl}`);
        return;
      }

      if (session.status !== "running") {
        context.log.info(
          `Devin session ${session.session_id} is not running (status: ${session.status}), skipping termination`,
        );
        return;
      }

      context.log.info(
        `Terminating Devin session ${session.session_id} for PR: ${prUrl}`,
      );
      await terminateDevinSession(apiKey, session.session_id);
      context.log.info(
        `Successfully terminated Devin session ${session.session_id}`,
      );
    } catch (error) {
      context.log.error(
        `Failed to terminate Devin session for PR ${prUrl}: ${error}`,
      );
    }
  });
};
