import { useMutationState } from "@tanstack/react-query";
import { useMemo } from "react";

export function useEnhancePendingState(sessionId: string) {
  const enhanceStates = useMutationState({
    filters: { mutationKey: ["enhance", sessionId], exact: true },
    select: (mutation) => mutation.state.status,
  });

  const isEnhancePending = useMemo(
    () => enhanceStates.some((s) => s === "pending"),
    [enhanceStates],
  );

  return isEnhancePending;
}

export function useTitleGenerationPendingState(sessionId: string) {
  const titleStates = useMutationState({
    filters: { mutationKey: ["generateTitle", sessionId], exact: true },
    select: (mutation) => mutation.state.status,
  });

  const isTitleGenerationPending = useMemo(
    () => titleStates.some((s) => s === "pending"),
    [titleStates],
  );

  return isTitleGenerationPending;
}
