import {
  createMCPClient,
  ElicitationRequestSchema,
  type MCPClient,
} from "@ai-sdk/mcp";
import { getVersion } from "@tauri-apps/api/app";
import { version as osVersion, platform } from "@tauri-apps/plugin-os";
import { useCallback, useEffect, useRef, useState } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";

import { useAuth } from "../auth";
import { env } from "../env";
import { TauriMCPTransport } from "./tauri-mcp-transport";

const TIMEOUT_MS = 10_000;
const ELICITATION_TIMEOUT_MS = 60_000;

type PendingElicitation = {
  message: string;
  requestedSchema: Record<string, unknown> | undefined;
  resolve: (approved: boolean) => void;
};

export type ContextItem = { label: string };

export function useSupportMCP(enabled: boolean, accessToken?: string | null) {
  const { session } = useAuth();
  const email = session?.user?.email;
  const userId = session?.user?.id;
  const [tools, setTools] = useState<Record<string, any>>({});
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [pendingElicitation, setPendingElicitation] =
    useState<PendingElicitation | null>(null);
  const [isReady, setIsReady] = useState(false);
  const clientRef = useRef<MCPClient | null>(null);
  const pendingRef = useRef<PendingElicitation | null>(null);

  const collectContext = async (): Promise<{
    items: ContextItem[];
    block: string | null;
  }> => {
    const items: ContextItem[] = [];
    const lines: string[] = [];

    if (email || userId) {
      items.push({ label: "Account" });
      if (email) lines.push(`- Email: ${email}`);
      if (userId) lines.push(`- User ID: ${userId}`);
    }

    try {
      const [appVersion, os, gitHashResult] = await Promise.all([
        getVersion(),
        osVersion(),
        miscCommands.getGitHash(),
      ]);
      const gitHash = gitHashResult.status === "ok" ? gitHashResult.data : null;
      items.push({ label: "Device" });
      lines.push(`- Platform: ${platform()}`);
      lines.push(`- OS Version: ${os}`);
      lines.push(`- App Version: ${appVersion}`);
      if (gitHash) lines.push(`- Build: ${gitHash}`);
    } catch {}

    const locale = navigator.language || "en";
    lines.push(`- Locale: ${locale}`);

    if (lines.length === 0) {
      return { items, block: null };
    }

    return {
      items,
      block:
        "---\nThe following is automatically collected context about the current user and their environment. Use it when filing issues or diagnosing problems.\n\n" +
        lines.join("\n"),
    };
  };

  const respondToElicitation = useCallback((approved: boolean) => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setPendingElicitation(null);
    pending?.resolve(approved);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setTools({});
      setSystemPrompt(undefined);
      setContextItems([]);
      setPendingElicitation(null);
      setIsReady(true);
      return;
    }

    setIsReady(false);

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    }, TIMEOUT_MS);

    const init = async () => {
      try {
        const mcpUrl = new URL("/support/mcp", env.VITE_AI_URL).toString();

        const headers: Record<string, string> = {};
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        const transport = new TauriMCPTransport(mcpUrl, headers);

        const client = await createMCPClient({
          transport,
          name: "hyprnote-support-client",
          capabilities: { elicitation: {} },
          onUncaughtError: (err) => {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("MCP uncaught error:", msg);
          },
        });

        client.onElicitationRequest(
          ElicitationRequestSchema,
          async (request) => {
            if (pendingRef.current) {
              return { action: "decline" as const };
            }

            const approved = await Promise.race([
              new Promise<boolean>((resolve) => {
                const pending: PendingElicitation = {
                  message: request.params.message,
                  requestedSchema: request.params.requestedSchema as
                    | Record<string, unknown>
                    | undefined,
                  resolve,
                };
                pendingRef.current = pending;
                setPendingElicitation(pending);
              }),
              new Promise<boolean>((resolve) =>
                setTimeout(() => resolve(false), ELICITATION_TIMEOUT_MS),
              ),
            ]);

            if (!approved) {
              pendingRef.current = null;
              setPendingElicitation(null);
              return { action: "decline" as const };
            }

            return {
              action: "accept" as const,
              content: { confirmed: true },
            };
          },
        );

        if (cancelled) {
          await client.close().catch(console.error);
          return;
        }

        clientRef.current?.close().catch(console.error);
        clientRef.current = client;

        const [{ items, block }, fetchedTools, prompt] = await Promise.all([
          collectContext(),
          client.tools(),
          client
            .experimental_getPrompt({ name: "support_chat" })
            .catch(() => null),
        ]);

        if (cancelled) return;

        setContextItems(items);
        setTools(fetchedTools);

        let mcpPrompt: string | undefined;
        if (prompt?.messages) {
          mcpPrompt = prompt.messages
            .map((m: { content: { type: string; text?: string } | string }) => {
              if (typeof m.content === "string") return m.content;
              if (m.content.type === "text" && m.content.text)
                return m.content.text;
              return "";
            })
            .filter(Boolean)
            .join("\n\n");
        }
        setSystemPrompt(
          [mcpPrompt, block].filter(Boolean).join("\n\n") || undefined,
        );

        clearTimeout(timeout);
        setIsReady(true);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const cause = error instanceof Error ? (error as any).cause : undefined;
        console.error("Failed to initialize MCP client:", msg, cause ?? "");
        if (!cancelled) {
          clearTimeout(timeout);
          setIsReady(true);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      const pending = pendingRef.current;
      pendingRef.current = null;
      setPendingElicitation(null);
      pending?.resolve(false);
      clientRef.current?.close().catch(console.error);
      clientRef.current = null;
    };
  }, [enabled, accessToken, email, userId]);

  return {
    tools,
    systemPrompt,
    contextItems,
    pendingElicitation,
    respondToElicitation,
    isReady,
  };
}
