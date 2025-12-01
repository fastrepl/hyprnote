import { Probot } from "probot";

import {
  findRunningSessionForPR,
  getDevinSessionDetail,
  isDevinSessionWorking,
} from "../devin/index.js";
import { createOrUpdateCheck, ProbotContext } from "../lib/github-checks.js";

const CHECK_NAME = "Devin";

export function registerDevinStatusHandler(app: Probot): void {
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
      const prUrl = pr.html_url;

      context.log.info(
        `[Devin] PR ${context.payload.action} for ${owner}/${repo}#${pr.number}`,
      );

      try {
        await checkDevinSession(context, owner, repo, headSha, prUrl);
      } catch (error) {
        context.log.error(`[Devin] Failed to check Devin session: ${error}`);
      }
    },
  );
}

async function checkDevinSession(
  context: ProbotContext,
  owner: string,
  repo: string,
  headSha: string,
  prUrl: string,
): Promise<void> {
  const session = await findRunningSessionForPR(prUrl);
  if (!session) {
    return;
  }

  const detail = await getDevinSessionDetail(session.session_id);
  if (!isDevinSessionWorking(detail)) {
    return;
  }

  await createOrUpdateCheck(context, {
    owner,
    repo,
    name: CHECK_NAME,
    head_sha: headSha,
    status: "in_progress",
    output: {
      title: "Devin is working",
      summary: `Devin session ${session.session_id} is currently working on this PR.`,
    },
  });
}
