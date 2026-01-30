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

async function createGitHubIssue(
  title: string,
  body: string,
  labels: string[],
): Promise<{ url: string; number: number } | { error: string }> {
  if (!env.YUJONGLEE_GITHUB_TOKEN_REPO) {
    return { error: "GitHub bot token not configured" };
  }

  const response = await fetch(
    "https://api.github.com/repos/fastrepl/hyprnote/issues",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.YUJONGLEE_GITHUB_TOKEN_REPO}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body,
        labels,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    return { error: `GitHub API error: ${response.status} - ${errorText}` };
  }

  const data = (await response.json()) as {
    html_url?: string;
    number?: number;
  };
  if (!data.html_url || !data.number) {
    return { error: "GitHub API did not return issue URL" };
  }

  return { url: data.html_url, number: data.number };
}

async function addCommentToIssue(
  issueNumber: number,
  comment: string,
): Promise<void> {
  if (!env.YUJONGLEE_GITHUB_TOKEN_REPO) {
    return;
  }

  await fetch(
    `https://api.github.com/repos/fastrepl/hyprnote/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.YUJONGLEE_GITHUB_TOKEN_REPO}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: comment }),
    },
  );
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

    const labels =
      type === "bug"
        ? ["bug", "user-reported"]
        : ["enhancement", "user-reported"];

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
