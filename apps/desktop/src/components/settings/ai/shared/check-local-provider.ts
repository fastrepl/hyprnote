import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { LMStudioClient } from "@lmstudio/sdk";
import { Effect, pipe } from "effect";

export type LocalProviderStatus = "connected" | "disconnected" | "checking";

const CHECK_TIMEOUT = "2 seconds";

export async function checkOllamaConnection(baseUrl: string): Promise<boolean> {
  if (!baseUrl) {
    return false;
  }

  return pipe(
    Effect.tryPromise(async () => {
      const ollamaHost = baseUrl.replace(/\/v1\/?$/, "");
      const response = await tauriFetch(`${ollamaHost}/api/tags`, {
        method: "GET",
        headers: {
          Origin: new URL(ollamaHost).origin,
        },
      });
      return response.ok;
    }),
    Effect.timeout(CHECK_TIMEOUT),
    Effect.catchAll(() => Effect.succeed(false)),
    Effect.runPromise,
  );
}

export async function checkLMStudioConnection(baseUrl: string): Promise<boolean> {
  if (!baseUrl) {
    return false;
  }

  return pipe(
    Effect.tryPromise(async () => {
      const url = new URL(baseUrl);
      const port = url.port || "1234";
      const formattedUrl = `ws:127.0.0.1:${port}`;
      const client = new LMStudioClient({ baseUrl: formattedUrl });
      await client.system.listDownloadedModels();
      return true;
    }),
    Effect.timeout(CHECK_TIMEOUT),
    Effect.catchAll(() => Effect.succeed(false)),
    Effect.runPromise,
  );
}
