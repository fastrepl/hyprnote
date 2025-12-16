import { Probot } from "probot";

import {
  DevinSessionStatus,
  findRunningSessionForPR,
  getDevinSessionDetail,
  getDevinStatusPoller,
  isDevinSessionActive,
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
  if (!isDevinSessionActive(detail)) {
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

  const sessionUrl = `https://app.devin.ai/sessions/${session.session_id}`;
  const isBlocked = detail.status_enum === DevinSessionStatus.Blocked;

  await createOrUpdateCheck(context, {
    owner,
    repo,
    name: CHECK_NAME,
    head_sha: headSha,
    status: "in_progress",
    details_url: sessionUrl,
    output: {
      title: isBlocked ? "Devin is blocked" : "Devin is working",
      summary: isBlocked
        ? `Devin session is blocked and waiting for input.\n\nView session: ${sessionUrl}`
        : `Devin session is currently working on this PR.\n\nView session: ${sessionUrl}`,
    },
  });
}
