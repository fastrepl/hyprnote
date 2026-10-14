import { useSyncExternalStore } from "react";

const trialStarts = new Map<string, Promise<unknown>>();

export function startTrialOnce<T>(
  userId: string,
  start: () => Promise<T>,
): Promise<T> {
  const existing = trialStarts.get(userId);
  if (existing) {
    return existing as Promise<T>;
  }

  const request = start().catch((error) => {
    trialStarts.delete(userId);
    throw error;
  });
  trialStarts.set(userId, request);
  return request;
}

// Only a just-created account is offered a retry with a work email.
const SWITCHABLE_ACCOUNT_AGE_MS = 30 * 60 * 1000;
const firstSeenAt = new Map<string, number>();

// Measured from when this app session first saw the user, so the choice
// does not expire while it is on screen.
export function isSwitchableAccount(
  user: { id: string; created_at?: string } | undefined,
): boolean {
  if (!user?.created_at) return false;
  let seenAt = firstSeenAt.get(user.id);
  if (seenAt === undefined) {
    seenAt = Date.now();
    firstSeenAt.set(user.id, seenAt);
  }
  const age = seenAt - new Date(user.created_at).getTime();
  return age >= 0 && age < SWITCHABLE_ACCOUNT_AGE_MS;
}

const autoTrialHolds = new Set<string>();
const autoTrialHoldListeners = new Set<() => void>();

function notifyAutoTrialHolds() {
  for (const listener of autoTrialHoldListeners) listener();
}

function subscribeAutoTrialHolds(listener: () => void) {
  autoTrialHoldListeners.add(listener);
  return () => {
    autoTrialHoldListeners.delete(listener);
  };
}

export function holdAutoTrial(userId: string): () => void {
  autoTrialHolds.add(userId);
  notifyAutoTrialHolds();
  return () => {
    autoTrialHolds.delete(userId);
    notifyAutoTrialHolds();
  };
}

export function useAutoTrialHeld(userId: string | undefined): boolean {
  return useSyncExternalStore(
    subscribeAutoTrialHolds,
    () => userId !== undefined && autoTrialHolds.has(userId),
  );
}
