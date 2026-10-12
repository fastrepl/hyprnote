export type SessionImportKind = "audio" | "transcript";

export type SessionImportRequest = {
  sessionId: string;
  kind: SessionImportKind;
};

type Listener = (request: SessionImportRequest) => void;

const pendingImports = new Map<string, SessionImportKind>();
const listeners = new Set<Listener>();

/**
 * Register an import request for a session.
 *
 * The request is stored until the session screen consumes it.
 * Subscribers are notified as well, covering the case where the
 * session screen has already mounted.
 */
export function requestSessionImport(
  sessionId: string,
  kind: SessionImportKind,
): void {
  const request: SessionImportRequest = { sessionId, kind };

  pendingImports.set(sessionId, kind);

  for (const listener of listeners) {
    listener(request);
  }
}

/**
 * Consume a pending import request exactly once.
 *
 * Returns null when there is no pending request for this session.
 */
export function consumeSessionImport(
  sessionId: string,
): SessionImportKind | null {
  const kind = pendingImports.get(sessionId);

  if (!kind) {
    return null;
  }

  pendingImports.delete(sessionId);

  return kind;
}

/**
 * Subscribe to import requests so an already-mounted session screen
 * can react immediately.
 *
 * Returns an unsubscribe function compatible with React effect cleanup.
 */
export function subscribeSessionImportRequests(
  listener: Listener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
