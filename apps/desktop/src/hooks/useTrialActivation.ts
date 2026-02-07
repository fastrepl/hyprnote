import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { postBillingStartTrial } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";

import { useAuth } from "../auth";
import { env } from "../env";
import {
  pollForTrialActivation,
  type PollResult,
} from "../utils/poll-trial-activation";

type UseTrialActivationOptions = {
  onActivated?: () => void;
  onTimeout?: () => void;
  onError?: (error: unknown) => void;
};

export function useTrialActivation(options: UseTrialActivationOptions = {}) {
  const auth = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async (): Promise<PollResult> => {
      const headers = auth?.getHeaders();
      if (!headers) {
        throw new Error("Not authenticated");
      }

      const client = createClient({ baseUrl: env.VITE_API_URL, headers });
      const { error } = await postBillingStartTrial({
        client,
        query: { interval: "monthly" },
      });
      if (error) {
        throw error;
      }

      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      return pollForTrialActivation({
        refreshSession: () => auth.refreshSession(),
        signal: abortController.signal,
      });
    },
    onSuccess: (result) => {
      if (result.status === "activated") {
        void analyticsCommands.event({ event: "trial_started", plan: "pro" });
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        void analyticsCommands.setProperties({
          email: auth?.session?.user.email,
          user_id: auth?.session?.user.id,
          set: {
            plan: "pro",
            trial_end_date: trialEndDate.toISOString(),
          },
        });
        options.onActivated?.();
      } else if (result.status === "timeout") {
        options.onTimeout?.();
      }
    },
    onError: (error) => {
      options.onError?.(error);
    },
  });

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  return {
    startTrial: mutation.mutate,
    startTrialAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    cancel,
  };
}
