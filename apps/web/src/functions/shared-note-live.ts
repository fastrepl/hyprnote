import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { env } from "@/env";
import { getSupabaseServerClient } from "@/functions/supabase";
import {
  MAX_SHARED_NOTE_DOCUMENT_BYTES,
  parseSharedNoteLiveTicket,
  parseSharedNoteWebEditResult,
  type SharedNoteLiveTicket,
  type SharedNoteWebEditResult,
} from "@/lib/shared-note-live";
import { shareIdSchema } from "@/lib/shared-notes";

const MAX_TICKET_RESPONSE_BYTES = 8 * 1024;
const MAX_WEB_EDIT_RESPONSE_BYTES = 2 * 1024 * 1024;

const webEditInputSchema = z
  .object({
    shareId: shareIdSchema,
    baseRevision: z.number().int().positive().safe(),
    mutationId: z.string().uuid(),
    title: z.string().max(512),
    body: z.unknown(),
    attachmentIds: z.array(z.string().uuid()).max(64),
  })
  .strict()
  .refine(
    ({ body }) =>
      new TextEncoder().encode(JSON.stringify(body)).byteLength <=
      MAX_SHARED_NOTE_DOCUMENT_BYTES,
  );

export type SharedNoteLiveTicketResult =
  | { status: "ready"; ticket: SharedNoteLiveTicket }
  | { status: "forbidden" }
  | { status: "error" };

export const createSharedNoteLiveTicket = createServerFn({ method: "POST" })
  .validator(shareIdSchema)
  .handler(async ({ data: shareId }): Promise<SharedNoteLiveTicketResult> => {
    setPrivateHeaders();
    const accessToken = await currentAccessToken();
    if (!accessToken) return { status: "forbidden" };

    try {
      const response = await fetch(
        new URL(
          `/sync/shares/${encodeURIComponent(shareId)}/live/ticket`,
          apiBaseUrl(),
        ),
        {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (response.status === 403 || response.status === 404) {
        return { status: "forbidden" };
      }
      if (!response.ok) return { status: "error" };
      const text = await response.text();
      if (
        new TextEncoder().encode(text).byteLength > MAX_TICKET_RESPONSE_BYTES
      ) {
        return { status: "error" };
      }
      return {
        status: "ready",
        ticket: parseSharedNoteLiveTicket(JSON.parse(text) as unknown),
      };
    } catch {
      return { status: "error" };
    }
  });

export const saveSharedNoteWebEdit = createServerFn({ method: "POST" })
  .validator(webEditInputSchema)
  .handler(async ({ data }): Promise<SharedNoteWebEditResult> => {
    setPrivateHeaders();
    const accessToken = await currentAccessToken();
    if (!accessToken) return { status: "forbidden" };

    try {
      const response = await fetch(
        new URL(
          `/sync/shares/${encodeURIComponent(data.shareId)}/web-edit`,
          apiBaseUrl(),
        ),
        {
          method: "PUT",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            baseRevision: data.baseRevision,
            mutationId: data.mutationId,
            title: data.title,
            body: data.body,
            attachmentIds: data.attachmentIds,
          }),
        },
      );
      if (response.status === 409) return { status: "conflict" };
      if (response.status === 403) return { status: "forbidden" };
      if (!response.ok) return { status: "error" };
      const text = await response.text();
      if (
        new TextEncoder().encode(text).byteLength > MAX_WEB_EDIT_RESPONSE_BYTES
      ) {
        return { status: "error" };
      }
      return parseSharedNoteWebEditResult(JSON.parse(text) as unknown);
    } catch {
      return { status: "error" };
    }
  });

async function currentAccessToken() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function setPrivateHeaders() {
  setResponseHeader("Cache-Control", "private, no-store");
  setResponseHeader("Referrer-Policy", "no-referrer");
  setResponseHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
}

function apiBaseUrl() {
  return env.VITE_API_URL.endsWith("/")
    ? env.VITE_API_URL
    : `${env.VITE_API_URL}/`;
}
