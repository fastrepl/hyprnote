import { Probot } from "probot";

import {
  findRunningSessionForPR,
  terminateDevinSession,
} from "../devin/index.js";

export function registerPrClosedHandler(app: Probot): void {
  app.on("pull_request.closed", async (context) => {
    const pr = context.payload.pull_request;
    const prUrl = pr.html_url;

    context.log.info(
      `PR closed: ${prUrl} merged=${pr.merged} state=${pr.state}`,
    );

    try {
      const session = await findRunningSessionForPR(prUrl);

      if (!session) {
        context.log.info(`No running Devin session found for ${prUrl}`);
        return;
      }

      context.log.info(
        `Terminating Devin session ${session.session_id} for ${prUrl}`,
      );
      await terminateDevinSession(session.session_id);
      context.log.info(
        `Successfully terminated Devin session ${session.session_id}`,
      );
    } catch (error) {
      context.log.error(
        `Failed to terminate Devin session for ${prUrl}: ${error}`,
      );
    }
  });
}
