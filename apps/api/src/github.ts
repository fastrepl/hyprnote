import type { ReleaseEvent } from "@octokit/webhooks-types";
import { createMiddleware } from "hono/factory";

import { env } from "./env";

type GitHubWebhookEvent = ReleaseEvent;

async function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  const expectedSignature = `sha256=${Array.from(
    new Uint8Array(signatureBuffer),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;

  return signature === expectedSignature;
}

export const verifyGitHubWebhook = createMiddleware<{
  Variables: { githubEvent: GitHubWebhookEvent };
}>(async (c, next) => {
  const signature = c.req.header("X-Hub-Signature-256");

  if (!signature) {
    return c.text("missing_github_signature", 400);
  }

  const body = await c.req.text();
  try {
    const isValid = await verifyGitHubSignature(
      body,
      signature,
      env.GITHUB_WEBHOOK_SECRET,
    );

    if (!isValid) {
      return c.text("invalid_signature", 401);
    }

    const event = JSON.parse(body) as GitHubWebhookEvent;
    c.set("githubEvent", event);
    await next();
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "unknown_error";
    return c.text(message, 400);
  }
});

export async function handleReleaseEvent(event: ReleaseEvent): Promise<void> {
  if (event.action !== "created") {
    return;
  }

  const { release, repository } = event;
  const prompt = `New release created for ${repository.full_name}:
- Tag: ${release.tag_name}
- Name: ${release.name || release.tag_name}
- Created at: ${release.created_at}
- Author: ${release.author?.login || "unknown"}
- URL: ${release.html_url}

${release.body ? `Release notes:\n${release.body}` : "No release notes provided."}`;

  const response = await fetch("https://api.devin.ai/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DEVIN_API_KEY}`,
    },
    body: JSON.stringify({
      idempotent: true,
      prompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create Devin session: ${response.status} ${errorText}`,
    );
  }

  const result = await response.json();
  console.log("Devin session created:", result);
}
