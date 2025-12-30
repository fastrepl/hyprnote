import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, ArrowRightIcon, CheckIcon } from "lucide-react";

import { type PermissionStatus } from "@hypr/plugin-permissions";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

export function useAccessPermission(config: {
  queryKey: string;
  checkPermission: () => Promise<
    | { status: "ok"; data: PermissionStatus }
    | { status: "error"; error: string }
  >;
  requestPermission: () => Promise<unknown>;
  openSettings: () => Promise<unknown>;
}) {
  const status = useQuery({
    queryKey: [config.queryKey],
    queryFn: async () => {
      const result = await config.checkPermission();
      if (result.status === "ok") {
        return result.data;
      }
      return "denied" as PermissionStatus;
    },
    refetchInterval: 1000,
  });

  const requestAccess = useMutation({
    mutationFn: config.requestPermission,
    onSuccess: () => {
      setTimeout(() => status.refetch(), 1000);
    },
  });

  const isAuthorized = status.data === "authorized";
  const isPending = requestAccess.isPending;

  const handleAction = async () => {
    if (isAuthorized) {
      await config.openSettings();
    } else if (status.data === "denied") {
      await config.openSettings();
    } else {
      requestAccess.mutate();
    }
  };

  return { status: status.data, isAuthorized, isPending, handleAction };
}

export function AccessPermissionRow({
  title,
  grantedDescription,
  requestDescription,
  isAuthorized,
  isPending,
  onAction,
}: {
  title: string;
  grantedDescription: string;
  requestDescription: string;
  isAuthorized: boolean;
  isPending: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex-1">
        <div
          className={cn([
            "flex items-center gap-2 mb-1",
            !isAuthorized && "text-red-500",
          ])}
        >
          {!isAuthorized && <AlertCircleIcon className="size-4" />}
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <p className="text-xs text-neutral-600">
          {isAuthorized ? grantedDescription : requestDescription}
        </p>
      </div>
      <Button
        variant={isAuthorized ? "outline" : "default"}
        size="icon"
        onClick={onAction}
        disabled={isPending}
        className={cn([
          "size-8",
          isAuthorized && "bg-stone-100 text-stone-800 hover:bg-stone-200",
        ])}
        aria-label={
          isAuthorized
            ? `Open ${title.toLowerCase()} settings`
            : `Request ${title.toLowerCase()}`
        }
      >
        {isAuthorized ? (
          <CheckIcon className="size-5" />
        ) : (
          <ArrowRightIcon className="size-5" />
        )}
      </Button>
    </div>
  );
}
