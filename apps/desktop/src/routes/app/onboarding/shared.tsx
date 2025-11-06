import type { ReactNode } from "react";

import { ArrowRightIcon } from "lucide-react";

import { cn } from "@hypr/utils";

export type OnboardingNext = (params?: { local?: boolean }) => void;

type OnboardingAction = {
  kind: "skip" | "next";
  hide?: boolean;
  onClick: () => void;
};

type OnboardingContainerProps = {
  title: string;
  description?: string;
  action?: OnboardingAction;
  children: ReactNode;
};

export function OnboardingContainer({ title, description, action, children }: OnboardingContainerProps) {
  return (
    <div className="w-full max-w-xl">
      <div className="flex flex-col gap-8">
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">{title}</h1>
          {description && <p className="text-base text-neutral-500">{description}</p>}
        </div>

        {children}

        {action && !action.hide && (
          <button
            className="self-center text-sm font-medium text-neutral-400 transition hover:text-neutral-600"
            onClick={action.onClick}
          >
            {action.kind}
          </button>
        )}
      </div>
    </div>
  );
}

type IntegrationRowProps = {
  icon: ReactNode;
  name: string;
  description: string;
  onConnect?: () => void;
  disabled?: boolean;
};

export function IntegrationRow({ icon, name, description, onConnect, disabled = false }: IntegrationRowProps) {
  return (
    <div
      className={cn([
        "flex items-center justify-between rounded-2xl border border-neutral-100 px-6 py-5",
        disabled && "opacity-50",
      ])}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-lg">
          {icon}
        </span>
        <div className="flex flex-col">
          <span className="text-base font-medium text-neutral-900">{name}</span>
          <span className="text-sm text-neutral-500">{description}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onConnect}
        disabled={disabled}
        className={cn([
          "flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:bg-neutral-700",
          disabled && "cursor-not-allowed hover:bg-neutral-900",
        ])}
      >
        <ArrowRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Divider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-neutral-200" />
      <span className="text-sm text-neutral-500">{text}</span>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}
