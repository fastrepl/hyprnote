import { Probot } from "probot";

import { findRunningSessionForPR, sendMessageToDevinSession } from "../devin";

export function registerFixMergeConflictHandler(app: Probot): void {
  app.on("check_suite.completed", async (context) => {
    const checkSuite = context.payload.check_suite;
    const pullRequests = checkSuite.pull_requests;

    if (pullRequests.length === 0) {
      return;
    }

    const conclusion = checkSuite.conclusion;

    if (conclusion !== "success") {
      return;
    }

    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;

    for (const pr of pullRequests) {
      try {
        const { data: pullRequest } = await context.octokit.pulls.get({
          owner,
          repo,
          pull_number: pr.number,
        });

        if (pullRequest.mergeable_state === "dirty") {
          const prUrl = pullRequest.html_url;

          context.log.info(
            `PR ${prUrl} has all checks passed but is unmergeable due to conflicts`,
          );

          const session = await findRunningSessionForPR(prUrl);

          if (!session) {
            context.log.info(`No running Devin session found for ${prUrl}`);
            continue;
          }

          const message = `All checks have passed for PR ${prUrl}, but it cannot be merged due to merge conflicts. Please resolve the conflicts.`;

          context.log.info(
            `Sending conflict notification to Devin session ${session.session_id}`,
          );

          await sendMessageToDevinSession(session.session_id, message);

          context.log.info(
            `Successfully sent conflict notification to Devin session ${session.session_id}`,
          );
        }
      } catch (error) {
        context.log.error(
          `Failed to handle merge conflict check for PR #${pr.number}: ${error}`,
        );
      }
    }
  });
}
