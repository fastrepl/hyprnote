import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@hypr/utils";

export function ToolCard({
  failed,
  children,
}: {
  failed?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn([
        "my-2 rounded-lg border overflow-hidden",
        failed ? "border-red-200" : "border-neutral-200",
      ])}
    >
      {children}
    </div>
  );
}

export function ToolCardHeader({
  icon,
  running,
  failed,
  done,
  label,
}: {
  icon: ReactNode;
  running: boolean;
  failed: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div
      className={cn([
        "px-3 py-1.5 flex items-center gap-2 text-xs",
        failed ? "bg-red-50 text-red-700" : "bg-neutral-50 text-neutral-600",
      ])}
    >
      {running ? (
        <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <span
          className={cn([
            "shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5",
            failed
              ? "text-red-500"
              : done
                ? "text-emerald-500"
                : "text-neutral-400",
          ])}
        >
          {icon}
        </span>
      )}
      <span className="font-medium">{label}</span>
    </div>
  );
}

export function ToolCardBody({ children }: { children: ReactNode }) {
  return <div className="px-3 py-2 flex flex-col gap-2">{children}</div>;
}

export function ToolCardFooterSuccess({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="px-3 py-2 bg-emerald-50 border-t border-emerald-200 flex items-center gap-2 hover:bg-emerald-100 transition-colors"
    >
      <CheckCircle2Icon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span className="text-xs text-emerald-700 font-medium">{label}</span>
      <ExternalLinkIcon className="w-3 h-3 text-emerald-500 ml-auto shrink-0" />
    </a>
  );
}

export function ToolCardFooterError({ text }: { text: string }) {
  return (
    <div className="px-3 py-2 bg-red-50 border-t border-red-200 flex items-center gap-2">
      <XCircleIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />
      <p className="text-xs text-red-600">{text}</p>
    </div>
  );
}

export function ToolCardFooterRaw({ text }: { text: string }) {
  return (
    <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-200">
      <p className="text-xs text-neutral-600 whitespace-pre-wrap">{text}</p>
    </div>
  );
}

export function MarkdownPreview({ children }: { children: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white">
      <div className="px-2.5 py-2 max-h-64 overflow-y-auto">
        <Streamdown
          className="text-xs text-neutral-700 leading-relaxed"
          linkSafety={{ enabled: false }}
        >
          {children}
        </Streamdown>
      </div>
    </div>
  );
}
