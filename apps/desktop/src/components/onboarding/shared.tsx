import { Button } from "@hypr/ui/components/ui/button";

import { ArrowRightIcon, CheckIcon } from "lucide-react";
import type { ReactNode } from "react";

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
    <>
      <div className="space-y-3 text-center mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
        {description && <p className="text-base text-neutral-500">{description}</p>}
      </div>

      <div className="flex flex-col gap-6 w-full max-w-md">
        {children}
      </div>

      {action && !action.hide && (
        <button
          className="self-center text-sm font-medium text-neutral-400 transition hover:text-neutral-600"
          onClick={action.onClick}
        >
          {action.kind}
        </button>
      )}
    </>
  );
}

type IntegrationRowProps = {
  icon: ReactNode;
  name: string;
  onConnect?: () => void;
  connected?: boolean;
  disabled?: boolean;
};

export function IntegrationRow({ icon, name, onConnect, connected = false, disabled = false }: IntegrationRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="text-base font-medium text-neutral-900">{name}</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onConnect}
        disabled={disabled || connected}
        className="h-8 w-8"
      >
        {connected ? <CheckIcon className="h-5 w-5" /> : <ArrowRightIcon className="h-5 w-5" />}
      </Button>
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
