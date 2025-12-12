import type { IngressWorkflowClient } from "@restatedev/restate-sdk-clients";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { z } from "zod";

import type { AppBindings } from "../hono-bindings";
import { getRestateClient } from "../integration/restate";
import { supabaseAuthMiddleware } from "../middleware/supabase";
import { API_TAGS } from "./constants";

const PipelineStatus = z.enum([
  "QUEUED",
  "TRANSCRIBING",
  "TRANSCRIBED",
  "LLM_RUNNING",
  "DONE",
  "ERROR",
]);

const StatusResponseSchema = z.object({
  status: PipelineStatus,
  providerResponse: z.string().optional(),
  error: z.string().optional(),
});

type StatusStateType = z.infer<typeof StatusResponseSchema>;

type SttFileInput = {
  userId: string;
  fileId: string;
};

type SttFileDefinition = {
  run: (ctx: unknown, input: SttFileInput) => Promise<StatusStateType>;
  getStatus: (ctx: unknown) => Promise<StatusStateType>;
};

type SttFileClient = IngressWorkflowClient<SttFileDefinition>;

const StartInputSchema = z.object({
  fileId: z.string(),
  pipelineId: z.string().optional(),
});

const StartResponseSchema = z.object({
  pipelineId: z.string(),
  invocationId: z.string(),
});

const StatusInputSchema = z.object({
  pipelineId: z.string(),
});

export const fileTranscription = new Hono<AppBindings>();

fileTranscription.post(
  "/start",
  describeRoute({
    tags: [API_TAGS.PRIVATE],
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "Pipeline started",
        content: {
          "application/json": { schema: resolver(StartResponseSchema) },
        },
      },
      400: { description: "Invalid fileId" },
      401: { description: "Unauthorized" },
      500: { description: "Internal error" },
    },
  }),
  supabaseAuthMiddleware,
  validator("json", StartInputSchema),
  async (c) => {
    const userId = c.get("supabaseUserId")!;
    const data = c.req.valid("json");

    const segments = data.fileId.split("/").filter(Boolean);
    const [ownerId, ...rest] = segments;

    if (
      !ownerId ||
      ownerId !== userId ||
      rest.length === 0 ||
      rest.some((s) => s === "." || s === "..")
    ) {
      return c.json({ error: "Invalid fileId" }, 400);
    }

    const safeFileId = `${userId}/${rest.join("/")}`;
    const rawId = data.pipelineId ?? crypto.randomUUID();
    const pipelineId = `${userId}:${rawId}`;

    try {
      const restateClient = getRestateClient();
      const workflowClient: SttFileClient =
        restateClient.workflowClient<SttFileDefinition>(
          { name: "SttFile" },
          pipelineId,
        );
      const handle = await workflowClient.workflowSubmit({
        userId,
        fileId: safeFileId,
      });

      return c.json({
        pipelineId,
        invocationId: handle.invocationId,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: errorMessage }, 500);
    }
  },
);

fileTranscription.get(
  "/status/:pipelineId",
  describeRoute({
    tags: [API_TAGS.PRIVATE],
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "Pipeline status",
        content: {
          "application/json": { schema: resolver(StatusResponseSchema) },
        },
      },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
      500: { description: "Internal error" },
    },
  }),
  supabaseAuthMiddleware,
  validator("param", StatusInputSchema),
  async (c) => {
    const userId = c.get("supabaseUserId")!;
    const { pipelineId } = c.req.valid("param");

    const [ownerId] = pipelineId.split(":");
    if (ownerId !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    try {
      const restateClient = getRestateClient();
      const workflowClient: SttFileClient =
        restateClient.workflowClient<SttFileDefinition>(
          { name: "SttFile" },
          pipelineId,
        );
      const status = await workflowClient.getStatus();

      return c.json(status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: errorMessage }, 500);
    }
  },
);

fileTranscription.get(
  "/result/:pipelineId",
  describeRoute({
    tags: [API_TAGS.PRIVATE],
    security: [{ Bearer: [] }],
    responses: {
      200: {
        description: "Pipeline result",
        content: {
          "application/json": { schema: resolver(StatusResponseSchema) },
        },
      },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
      500: { description: "Internal error" },
    },
  }),
  supabaseAuthMiddleware,
  validator("param", StatusInputSchema),
  async (c) => {
    const userId = c.get("supabaseUserId")!;
    const { pipelineId } = c.req.valid("param");

    const [ownerId] = pipelineId.split(":");
    if (ownerId !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    try {
      const restateClient = getRestateClient();
      const workflowClient: SttFileClient =
        restateClient.workflowClient<SttFileDefinition>(
          { name: "SttFile" },
          pipelineId,
        );
      const result = await workflowClient.workflowAttach();

      return c.json(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: errorMessage }, 500);
    }
  },
);
