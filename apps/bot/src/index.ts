import { ApplicationFunctionOptions, Probot } from "probot";

const BOT_CI_CHECK_NAME = "bot_ci";
const MERGEABLE_CHECK_NAME = "Mergeable: bot_ci";

interface CheckRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
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

  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue!",
    });
    await context.octokit.issues.createComment(issueComment);
  });
};
