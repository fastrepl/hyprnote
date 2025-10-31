import { usePrevious } from "@uidotdev/usehooks";
import { useEffect, useRef } from "react";

import type { TaskStatus } from "../store/zustand/ai-task/tasks";

export function useTaskStatus(
  status: TaskStatus,
  options: Partial<{
    onSuccess: () => void;
    onError: () => void;
  }>,
) {
  const prevStatus = usePrevious(status);
  const onSuccessRef = useRef(options?.onSuccess);
  const onErrorRef = useRef(options?.onError);

  onSuccessRef.current = options?.onSuccess;
  onErrorRef.current = options?.onError;

  useEffect(() => {
    if (prevStatus === "generating" && status === "success") {
      onSuccessRef.current?.();
    }
    if (prevStatus === "generating" && status === "error") {
      onErrorRef.current?.();
    }
  }, [status, prevStatus]);

  return {
    status,
    isGenerating: status === "generating",
    isSuccess: status === "success",
    isError: status === "error",
    isIdle: status === "idle",
  };
}
