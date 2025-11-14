import { AlertCircleIcon, CheckCircleIcon, Loader2Icon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

export function ConnectionHealth({
  status,
  tooltip,
}: {
  status?: "loading" | "error" | "success" | null;
  tooltip: string;
}) {
  if (!status) {
    return null;
  }

  const color =
    status === "loading"
      ? "text-yellow-500"
      : status === "error"
        ? "text-red-500"
        : "text-green-500";

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div className={color}>
          {status === "loading" ? (
            <Loader2Icon size={16} className="animate-spin" />
          ) : status === "error" ? (
            <AlertCircleIcon size={16} />
          ) : status === "success" ? (
            <CheckCircleIcon size={16} />
          ) : null}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function AvailabilityHealth({ message }: { message: string }) {
  return (
    <div
      className={cn([
        "flex items-center justify-center gap-2 text-center",
        "bg-red-50/70 border-b border-red-200",
        "py-3 px-4 -mx-6 -mt-6",
        "text-sm text-red-700",
      ])}
    >
      <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
      {message}
    </div>
  );
}
