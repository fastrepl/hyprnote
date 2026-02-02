import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { z } from "zod";

import { env } from "../env";
import type { AppBindings } from "../hono-bindings";
import { API_TAGS } from "./constants";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

const FeedbackRequestSchema = z.object({
  type: z.enum(["bug", "feature"]),
  description: z.string().min(10),
  logs: z.string().optional(),
  deviceInfo: z.object({
    platform: z.string(),
    arch: z.string(),
    osVersion: z.string(),
    appVersion: z.string(),
    gitHash: z.string(),
  }),
});

const FeedbackResponseSchema = z.object({
  success: z.boolean(),
  issueUrl: z.string().optional(),
  error: z.string().optional(),
});

async function analyzeLogsWithAI(logs: string): Promise<string | null> {
  try {
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Extract only ERROR and WARNING entries from these logs. Output max 800 chars, no explanation:\n\n${logs.slice(-10000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    return content ? content.slice(0, 800) : null;
  } catch {
    return null;
  }
}

function getGitHubClient(): Octokit | null {
  if (
    !env.GITHUB_APP_ID ||
    !env.GITHUB_APP_PRIVATE_KEY ||
    !env.GITHUB_APP_INSTALLATION_ID
  ) {
    return null;
  }

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
      installationId: env.GITHUB_APP_INSTALLATION_ID,
    },
  });
}

async function createGitHubIssue(
  title: string,
  body: string,
  labels: string[],
): Promise<{ url: string; number: number } | { error: string }> {
  const octokit = getGitHubClient();
  if (!octokit) {
    return { error: "GitHub App credentials not configured" };
  }

  try {
    const response = await octokit.issues.create({
      owner: "fastrepl",
      repo: "hyprnote",
      title,
      body,
      labels,
    });

    return {
      url: response.data.html_url,
      number: response.data.number,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { error: `GitHub API error: ${errorMessage}` };
  }
}

async function addCommentToIssue(
  issueNumber: number,
  comment: string,
): Promise<void> {
  const octokit = getGitHubClient();
  if (!octokit) {
    return;
  }

  try {
    await octokit.issues.createComment({
      owner: "fastrepl",
      repo: "hyprnote",
      issue_number: issueNumber,
      body: comment,
    });
  } catch {
    // Silently fail for comment creation
  }
}

export const feedback = new Hono<AppBindings>();

feedback.post(
  "/submit",
  describeRoute({
    tags: [API_TAGS.PRIVATE_SKIP_OPENAPI],
    responses: {
      200: {
        description: "Feedback submitted successfully",
        content: {
          "application/json": {
            schema: resolver(FeedbackResponseSchema),
          },
        },
      },
      400: {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: resolver(FeedbackResponseSchema),
          },
        },
      },
      500: {
        description: "Server error",
        content: {
          "application/json": {
            schema: resolver(FeedbackResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", FeedbackRequestSchema),
  async (c) => {
    const { type, description, logs, deviceInfo } = c.req.valid("json");

    const trimmedDescription = description.trim();
    const firstLine = trimmedDescription.split("\n")[0].slice(0, 100).trim();
    const title =
      firstLine || (type === "bug" ? "Bug Report" : "Feature Request");

    const deviceInfoSection = [
      `**Platform:** ${deviceInfo.platform}`,
      `**Architecture:** ${deviceInfo.arch}`,
      `**OS Version:** ${deviceInfo.osVersion}`,
      `**App Version:** ${deviceInfo.appVersion}`,
      `**Git Hash:** ${deviceInfo.gitHash}`,
    ].join("\n");

    const body =
      type === "bug"
        ? `## Description
${trimmedDescription}

## Device Information
${deviceInfoSection}

---
*This issue was submitted from the Hyprnote desktop app.*
`
        : `## Feature Request
${trimmedDescription}

## Submitted From
${deviceInfoSection}

---
*This feature request was submitted from the Hyprnote desktop app.*
`;

    const labels = ["product/desktop"];

    const result = await createGitHubIssue(title, body, labels);

    if ("error" in result) {
      return c.json({ success: false, error: result.error }, 500);
    }

    if (logs) {
      const logSummary = await analyzeLogsWithAI(logs);
      const logComment = `## Log Analysis

${logSummary?.trim() ? `### Summary\n\`\`\`\n${logSummary}\n\`\`\`` : "_No errors or warnings found._"}

<details>
<summary>Raw Logs (last 10KB)</summary>

\`\`\`
${logs.slice(-10000)}
\`\`\`

</details>`;

      await addCommentToIssue(result.number, logComment);
    }

    return c.json({ success: true, issueUrl: result.url }, 200);
  },
);
