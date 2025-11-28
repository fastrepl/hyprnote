import { getUniqueId, type MergeableStore } from "tinybase";
import { createCustomSynchronizer } from "tinybase/synchronizers";

type TinybaseSyncPayload = [
  fromClientId: string,
  requestId: string | null,
  message: number,
  body: unknown,
];

interface TinybaseSyncEnvelope {
  kind: "tinybase-sync";
  payload: TinybaseSyncPayload;
}

function isTinybaseSyncEnvelope(data: unknown): data is TinybaseSyncEnvelope {
  return (
    typeof data === "object" &&
    data !== null &&
    "kind" in data &&
    data.kind === "tinybase-sync" &&
    "payload" in data &&
    Array.isArray(data.payload)
  );
}

/**
 * Creates a TinyBase synchronizer for the parent (main webview) side
 * that syncs with an iframe via postMessage.
 *
 * Returns the synchronizer object. Call .startSync() to begin syncing.
 */
export function createIframeSynchronizer(
  store: MergeableStore,
  iframe: HTMLIFrameElement,
  targetOrigin = "*",
) {
  const clientId = getUniqueId();
  let handler: ((event: MessageEvent) => void) | null = null;

  const synchronizer = createCustomSynchronizer(
    store,
    // send: ship a message to the iframe via postMessage
    (_toClientId, requestId, message, body) => {
      const payload: TinybaseSyncPayload = [
        clientId,
        requestId as string | null,
        message,
        body,
      ];

      iframe.contentWindow?.postMessage(
        {
          kind: "tinybase-sync",
          payload,
        } satisfies TinybaseSyncEnvelope,
        targetOrigin,
      );
    },
    // registerReceive: wire TinyBase's receive() into window.message
    (receive) => {
      handler = (event: MessageEvent) => {
        // Only messages from this iframe
        if (event.source !== iframe.contentWindow) return;
        if (!isTinybaseSyncEnvelope(event.data)) return;

        const [fromClientId, requestId, message, body] = event.data.payload;
        receive(fromClientId, requestId as string, message, body);
      };

      window.addEventListener("message", handler);
    },
    // destroy: clean up the listener
    () => {
      if (handler) {
        window.removeEventListener("message", handler);
        handler = null;
      }
    },
    5, // request timeout in seconds
  );

  return synchronizer;
}

/**
 * Creates a TinyBase synchronizer for the iframe (extension) side
 * that syncs with the parent window via postMessage.
 *
 * Returns the synchronizer object. Call .startSync() to begin syncing.
 */
export function createParentSynchronizer(
  store: MergeableStore,
  targetOrigin = "*",
) {
  const clientId = getUniqueId();
  let handler: ((event: MessageEvent) => void) | null = null;

  const synchronizer = createCustomSynchronizer(
    store,
    // send: send messages back to parent
    (_toClientId, requestId, message, body) => {
      const payload: TinybaseSyncPayload = [
        clientId,
        requestId as string | null,
        message,
        body,
      ];

      window.parent.postMessage(
        {
          kind: "tinybase-sync",
          payload,
        } satisfies TinybaseSyncEnvelope,
        targetOrigin,
      );
    },
    // registerReceive: listen for parent messages
    (receive) => {
      handler = (event: MessageEvent) => {
        // Ensure this is from the parent
        if (event.source !== window.parent) return;
        if (!isTinybaseSyncEnvelope(event.data)) return;

        const [fromClientId, requestId, message, body] = event.data.payload;
        receive(fromClientId, requestId as string, message, body);
      };

      window.addEventListener("message", handler);
    },
    // destroy
    () => {
      if (handler) {
        window.removeEventListener("message", handler);
        handler = null;
      }
    },
    5,
  );

  return synchronizer;
}
