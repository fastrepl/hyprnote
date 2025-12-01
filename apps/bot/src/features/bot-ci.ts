import { Context, Probot } from "probot";

const SOURCE_CHECK_NAME = "bot_ci";
const MERGEABLE_CHECK_NAME = "Mergeable: bot_ci";

type CheckStatus = "queued" | "in_progress" | "completed";
type CheckConclusion =
  | "action_required"
  | "cancelled"
  | "failure"
  | "neutral"
  | "success"
  | "skipped"
  | "stale"
  | "timed_out"
  | null;

export function registerBotCiHandler(app: Probot): void {
  app.on("check_run", async (context) => {
    const checkRun = context.payload.check_run;

    if (checkRun.name !== SOURCE_CHECK_NAME) {
      return;
    }

    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const headSha = checkRun.head_sha;

    await createOrUpdateMergeableCheck(
      context.octokit,
      owner,
      repo,
      headSha,
      checkRun.status as CheckStatus,
      checkRun.conclusion as CheckConclusion,
    );
  });

  app.on("pull_request.opened", async (context) => {
    const pullRequest = context.payload.pull_request;
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;
    const headSha = pullRequest.head.sha;

    const { data: checkRuns } = await context.octokit.checks.listForRef({
      owner,
      repo,
      ref: headSha,
      check_name: SOURCE_CHECK_NAME,
    });

    if (checkRuns.total_count === 0) {
      await createOrUpdateMergeableCheck(
        context.octokit,
        owner,
        repo,
        headSha,
        "completed",
        "success",
        "bot_ci not triggered",
        "bot_ci check was not triggered for this PR.",
      );
    }
  });
}

async function createOrUpdateMergeableCheck(
  octokit: Context["octokit"],
  owner: string,
  repo: string,
  headSha: string,
  status: CheckStatus,
  conclusion: CheckConclusion,
  titleOverride?: string,
  summaryOverride?: string,
): Promise<void> {
  const { data: existingChecks } = await octokit.checks.listForRef({
    owner,
    repo,
    ref: headSha,
    check_name: MERGEABLE_CHECK_NAME,
  });

  const existingCheck = existingChecks.check_runs.find(
    (check) => check.name === MERGEABLE_CHECK_NAME,
  );

  let title: string;
  let summary: string;

  if (titleOverride && summaryOverride) {
    title = titleOverride;
    summary = summaryOverride;
  } else if (status === "in_progress") {
    title = "Waiting for bot_ci to complete";
    summary = "The bot_ci check is currently running.";
  } else if (status === "completed" && conclusion === "success") {
    title = "bot_ci passed";
    summary = "The bot_ci check has passed.";
  } else if (status === "completed" && conclusion === "failure") {
    title = "bot_ci failure";
    summary = "The bot_ci check has failed.";
  } else {
    title = `bot_ci ${status}`;
    summary = `The bot_ci check is ${status}.`;
  }

  // Convert null to undefined since Octokit expects undefined, not null
  const conclusionValue =
    status === "completed" ? (conclusion ?? undefined) : undefined;

  if (existingCheck) {
    await octokit.checks.update({
      owner,
      repo,
      check_run_id: existingCheck.id,
      status,
      conclusion: conclusionValue,
      output: { title, summary },
    });
  } else {
    await octokit.checks.create({
      owner,
      repo,
      name: MERGEABLE_CHECK_NAME,
      head_sha: headSha,
      status,
      conclusion: conclusionValue,
      output: { title, summary },
    });
  }
}
