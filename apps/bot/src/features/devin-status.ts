import { Probot } from "probot";

import {
  findRunningSessionForPR,
  getDevinSessionDetail,
  getDevinStatusPoller,
  isDevinSessionWorking,
} from "../devin/index.js";
import { createOrUpdateCheck, ProbotContext } from "../github/check.js";

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
      const prNumber = pr.number;

      context.log.info(
        `[Devin] PR ${context.payload.action} for ${owner}/${repo}#${prNumber}`,
      );

      // Skip Devin API calls during tests to avoid network requests
      if (process.env.NODE_ENV === "test") {
        return;
      }

      try {
        await checkDevinSession(context, owner, repo, prNumber, headSha, prUrl);
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
  prNumber: number,
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

  const poller = getDevinStatusPoller();
  if (poller) {
    poller.trackPR({
      owner,
      repo,
      prNumber,
      prUrl,
      headSha,
      sessionId: session.session_id,
      addedAt: Date.now(),
    });
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
