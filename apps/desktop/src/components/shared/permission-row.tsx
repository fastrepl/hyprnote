import { Check, CheckCircle2Icon } from "lucide-react";

import type { PermissionStatus } from "@hypr/plugin-permissions";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

export function PermissionRow({
  icon,
  title,
  description,
  status,
  isPending,
  onAction,
  variant = "default",
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  status: PermissionStatus | undefined;
  isPending: boolean;
  onAction: () => void;
  variant?: "default" | "compact";
}) {
  const isAuthorized = status === "authorized";
  const isDenied = status === "denied";

  let displayMessage = description || "";
  let buttonText = "";

  if (isAuthorized) {
    displayMessage = variant === "compact" ? "Thanks for granting permission" : "Access Granted";
    buttonText = "Access Granted";
  } else if (isDenied) {
    displayMessage = variant === "compact"
      ? "You should toggle in the Settings manually"
      : "Access denied - Open Settings to enable";
    buttonText = "Open Settings";
  } else {
    displayMessage = description || "You need to grant access to use Hyprnote";
    buttonText = "Enable";
  }

  if (variant === "compact") {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className={cn("text-sm font-medium mb-1", isDenied && "text-red-500")}>
            {title}
          </h3>
          <p className={cn(["text-xs", isAuthorized ? "text-neutral-600" : "text-red-500"])}>
            {displayMessage}
          </p>
        </div>
        <Button
          variant={isAuthorized ? "outline" : "default"}
          className="w-40 text-xs shadow-none"
          disabled={isAuthorized || isPending}
          onClick={onAction}
        >
          {isPending
            ? (
              <>
                <Spinner className="mr-1" />
                Requesting...
              </>
            )
            : (
              <>
                {isAuthorized ? <Check size={16} /> : null}
                {buttonText}
              </>
            )}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn([
        "flex items-center justify-between rounded-2xl border px-6 py-5",
        "transition-all duration-200",
        isAuthorized ? "border-blue-500 bg-blue-50" : "bg-white border-neutral-200",
      ])}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div
            className={cn([
              "flex size-10 items-center justify-center rounded-full flex-shrink-0",
              isAuthorized ? "bg-blue-100" : "bg-neutral-50",
            ])}
          >
            <div className={cn(isAuthorized ? "text-blue-600" : "text-neutral-500")}>{icon}</div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{title}</div>
          <div className="text-sm text-muted-foreground">
            {isAuthorized
              ? (
                <span className="text-blue-600 flex items-center gap-1">
                  <CheckCircle2Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  Access Granted
                </span>
              )
              : <span className="block truncate pr-2">{displayMessage}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!isAuthorized && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            disabled={isPending}
            className="min-w-20"
          >
            {isPending
              ? (
                <>
                  <Spinner className="mr-2" />
                  Requesting...
                </>
              )
              : <p>{buttonText}</p>}
          </Button>
        )}
        {isAuthorized && (
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-100">
            <CheckCircle2Icon className="w-4 h-4 text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}
