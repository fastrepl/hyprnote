// https://docs.devin.ai/api-reference/sessions/list-sessions.
import { DEVIN_API_BASE_URL, fetchFromDevin } from "./shared.js";

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 50;

export interface DevinSession {
  session_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  title?: string;
  pull_request: {
    url: string;
  } | null;
}

interface ListSessionsResponse {
  sessions: DevinSession[];
}

interface ListSessionsOptions {
  limit?: number;
  offset?: number;
  status?: string;
}

export async function listDevinSessions(
  options: ListSessionsOptions = {},
): Promise<ListSessionsResponse> {
  const url = new URL(`${DEVIN_API_BASE_URL}/sessions`);
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;
  const offset = options.offset ?? 0;

  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("offset", offset.toString());

  if (options.status) {
    url.searchParams.set("status", options.status);
  }

  const response = await fetchFromDevin(url.toString(), {
    method: "GET",
  });

  return (await response.json()) as ListSessionsResponse;
}

export async function findRunningSessionForPR(
  prUrl: string,
): Promise<DevinSession | null> {
  let offset = 0;
  const limit = DEFAULT_PAGE_SIZE;

  for (let i = 0; i < MAX_PAGES; i++) {
    const { sessions } = await listDevinSessions({
      limit,
      offset,
      status: "running",
    });

    if (sessions.length === 0) {
      break;
    }

    const match = sessions.find(
      (session) => session.pull_request?.url === prUrl,
    );
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
