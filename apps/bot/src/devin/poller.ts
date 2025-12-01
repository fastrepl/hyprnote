import { Probot } from "probot";

import {
  DevinSessionStatus,
  findRunningSessionForPR,
  getDevinSessionDetail,
  listDevinSessions,
} from "./index.js";

const CHECK_NAME = "Devin";
const DEFAULT_POLL_INTERVAL_MS = 60_000;

export interface TrackedPR {
  owner: string;
  repo: string;
  prNumber: number;
  prUrl: string;
  headSha: string;
  sessionId: string;
  addedAt: number;
}

export interface OctokitLike {
  checks: {
    listForRef: (params: {
      owner: string;
      repo: string;
      ref: string;
      check_name: string;
    }) => Promise<{
      data: {
        check_runs: Array<{ id: number; name: string }>;
      };
    }>;
    create: (params: {
      owner: string;
      repo: string;
      name: string;
      head_sha: string;
      status?: "queued" | "in_progress" | "completed";
      conclusion?:
        | "action_required"
        | "cancelled"
        | "failure"
        | "neutral"
        | "success"
        | "skipped"
        | "stale"
        | "timed_out";
      output: { title: string; summary: string };
    }) => Promise<unknown>;
    update: (params: {
      owner: string;
      repo: string;
      check_run_id: number;
      status?: "queued" | "in_progress" | "completed";
      conclusion?:
        | "action_required"
        | "cancelled"
        | "failure"
        | "neutral"
        | "success"
        | "skipped"
        | "stale"
        | "timed_out";
      output: { title: string; summary: string };
    }) => Promise<unknown>;
  };
  pulls: {
    get: (params: {
      owner: string;
      repo: string;
      pull_number: number;
    }) => Promise<{
      data: {
        state: string;
        head: { sha: string };
      };
    }>;
  };
}

interface DevinStatusPollerOptions {
  pollIntervalMs?: number;
  createOctokit: () => Promise<OctokitLike>;
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
}

export class DevinStatusPoller {
  private trackedPRs: Map<string, TrackedPR> = new Map();
  private pollIntervalMs: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private createOctokit: () => Promise<OctokitLike>;
  private logger: {
    info: (message: string) => void;
    error: (message: string) => void;
  };

  constructor(options: DevinStatusPollerOptions) {
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.createOctokit = options.createOctokit;
    this.logger = options.logger ?? {
      info: (msg) => console.log(`[DevinStatusPoller] ${msg}`),
      error: (msg) => console.error(`[DevinStatusPoller] ${msg}`),
    };
  }

  start(): void {
    if (this.intervalId) {
      this.logger.info("Poller already running");
      return;
    }

    this.logger.info(`Starting poller with interval ${this.pollIntervalMs}ms`);

    this.intervalId = setInterval(() => {
      this.pollAllTrackedPRs().catch((error) => {
        this.logger.error(`Poll cycle failed: ${error}`);
      });
    }, this.pollIntervalMs);

    this.discoverExistingDevinPRs().catch((error) => {
      this.logger.error(`Failed to discover existing Devin PRs: ${error}`);
    });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.info("Poller stopped");
    }
  }

  trackPR(pr: TrackedPR): void {
    const key = pr.prUrl;
    if (!this.trackedPRs.has(key)) {
      this.trackedPRs.set(key, pr);
      this.logger.info(
        `Now tracking PR ${pr.prUrl} with session ${pr.sessionId}`,
      );
    } else {
      const existing = this.trackedPRs.get(key)!;
      existing.headSha = pr.headSha;
      existing.sessionId = pr.sessionId;
      this.logger.info(
        `Updated tracking for PR ${pr.prUrl} with session ${pr.sessionId}`,
      );
    }
  }

  untrackPR(prUrl: string): void {
    if (this.trackedPRs.delete(prUrl)) {
      this.logger.info(`Stopped tracking PR ${prUrl}`);
    }
  }

  getTrackedPRs(): TrackedPR[] {
    return Array.from(this.trackedPRs.values());
  }

  private async discoverExistingDevinPRs(): Promise<void> {
    this.logger.info("Discovering existing Devin sessions with open PRs...");

    try {
      const { sessions } = await listDevinSessions({ status: "running" });

      for (const session of sessions) {
        if (!session.pull_request?.url) {
          continue;
        }

        const prUrl = session.pull_request.url;
        const parsed = this.parsePRUrl(prUrl);
        if (!parsed) {
          continue;
        }

        const detail = await getDevinSessionDetail(session.session_id);
        if (detail.status_enum !== DevinSessionStatus.Working) {
          continue;
        }

        try {
          const octokit = await this.createOctokit();
          const { data: pr } = await octokit.pulls.get({
            owner: parsed.owner,
            repo: parsed.repo,
            pull_number: parsed.prNumber,
          });

          if (pr.state !== "open") {
            continue;
          }

          this.trackPR({
            owner: parsed.owner,
            repo: parsed.repo,
            prNumber: parsed.prNumber,
            prUrl,
            headSha: pr.head.sha,
            sessionId: session.session_id,
            addedAt: Date.now(),
          });
        } catch {
          this.logger.error(`Failed to fetch PR details for ${prUrl}`);
        }
      }

      this.logger.info(
        `Discovered ${this.trackedPRs.size} PRs with active Devin sessions`,
      );
    } catch (error) {
      this.logger.error(`Failed to discover existing sessions: ${error}`);
    }
  }

  private parsePRUrl(
    prUrl: string,
  ): { owner: string; repo: string; prNumber: number } | null {
    const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
      return null;
    }
    return {
      owner: match[1],
      repo: match[2],
      prNumber: parseInt(match[3], 10),
    };
  }

  private async pollAllTrackedPRs(): Promise<void> {
    const prs = this.getTrackedPRs();
    if (prs.length === 0) {
      return;
    }

    this.logger.info(`Polling ${prs.length} tracked PRs`);

    for (const pr of prs) {
      try {
        await this.checkPRStatus(pr);
      } catch (error) {
        this.logger.error(
          `Failed to check status for PR ${pr.prUrl}: ${error}`,
        );
      }
    }
  }

  private async checkPRStatus(pr: TrackedPR): Promise<void> {
    const session = await findRunningSessionForPR(pr.prUrl);

    if (!session) {
      this.logger.info(
        `No running session found for PR ${pr.prUrl}, marking as complete`,
      );
      await this.updateCheckStatus(pr, "completed", "success", {
        title: "Devin finished",
        summary: "Devin has completed working on this PR.",
      });
      this.untrackPR(pr.prUrl);
      return;
    }

    const detail = await getDevinSessionDetail(session.session_id);

    if (detail.status_enum === DevinSessionStatus.Working) {
      await this.updateCheckStatus(pr, "in_progress", undefined, {
        title: "Devin is working",
        summary: `Devin session ${session.session_id} is currently working on this PR.`,
      });
      return;
    }

    if (detail.status_enum === DevinSessionStatus.Blocked) {
      await this.updateCheckStatus(pr, "in_progress", undefined, {
        title: "Devin is blocked",
        summary: `Devin session ${session.session_id} is blocked and waiting for input.`,
      });
      return;
    }

    if (detail.status_enum === DevinSessionStatus.Finished) {
      await this.updateCheckStatus(pr, "completed", "success", {
        title: "Devin finished",
        summary: `Devin session ${session.session_id} has completed.`,
      });
      this.untrackPR(pr.prUrl);
      return;
    }

    if (detail.status_enum === DevinSessionStatus.Expired) {
      await this.updateCheckStatus(pr, "completed", "cancelled", {
        title: "Devin session expired",
        summary: `Devin session ${session.session_id} has expired.`,
      });
      this.untrackPR(pr.prUrl);
      return;
    }

    this.logger.info(
      `PR ${pr.prUrl} session ${session.session_id} status: ${detail.status_enum}`,
    );
  }

  private async updateCheckStatus(
    pr: TrackedPR,
    status: "queued" | "in_progress" | "completed",
    conclusion:
      | "action_required"
      | "cancelled"
      | "failure"
      | "neutral"
      | "success"
      | "skipped"
      | "stale"
      | "timed_out"
      | undefined,
    output: { title: string; summary: string },
  ): Promise<void> {
    try {
      const octokit = await this.createOctokit();
      const existingChecks = await octokit.checks.listForRef({
        owner: pr.owner,
        repo: pr.repo,
        ref: pr.headSha,
        check_name: CHECK_NAME,
      });

      const existingCheck = existingChecks.data.check_runs.find(
        (check) => check.name === CHECK_NAME,
      );

      if (existingCheck) {
        await octokit.checks.update({
          owner: pr.owner,
          repo: pr.repo,
          check_run_id: existingCheck.id,
          status,
          conclusion: status === "completed" ? conclusion : undefined,
          output,
        });
      } else {
        await octokit.checks.create({
          owner: pr.owner,
          repo: pr.repo,
          name: CHECK_NAME,
          head_sha: pr.headSha,
          status,
          conclusion: status === "completed" ? conclusion : undefined,
          output,
        });
      }

      this.logger.info(
        `Updated check for PR ${pr.prUrl}: ${status} ${conclusion ?? ""}`,
      );
    } catch (error) {
      this.logger.error(`Failed to update check for PR ${pr.prUrl}: ${error}`);
    }
  }
}

let poller: DevinStatusPoller | null = null;

export function getDevinStatusPoller(): DevinStatusPoller | null {
  return poller;
}

export function startDevinStatusPoller(app: Probot): void {
  if (poller) {
    return;
  }

  poller = new DevinStatusPoller({
    pollIntervalMs: 60_000,
    createOctokit: async () => {
      const octokit = await app.auth();
      return octokit;
    },
    logger: {
      info: (msg) => app.log.info(msg),
      error: (msg) => app.log.error(msg),
    },
  });

  poller.start();
  app.log.info("[Devin] Status poller started");
}
