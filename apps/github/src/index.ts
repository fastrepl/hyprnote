import { ApplicationFunctionOptions, Probot } from "probot";

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

export default (app: Probot, { getRouter }: ApplicationFunctionOptions) => {
  if (getRouter) {
    const router = getRouter("/");

    router.get("/health", (_req, res) => {
      res.send("OK");
    });
  }

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
