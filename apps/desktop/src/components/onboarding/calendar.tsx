import { Icon } from "@iconify-icon/react";

import { useAuth } from "../../auth";
import { Route } from "../../routes/app/onboarding";
import { getNext, type StepProps } from "./config";
import { Divider, IntegrationRow, OnboardingContainer } from "./shared";

export function Calendars({ onNavigate }: StepProps) {
  const search = Route.useSearch();
  const auth = useAuth();
  const isLoggedIn = !!auth?.session;

  return (
    <OnboardingContainer title="Connect your calendars to be reminded every time">
      <div className="flex flex-col gap-4">
        {!isLoggedIn ? (
          <>
            <IntegrationRow
              icon={<Icon icon="logos:google-calendar" size={24} />}
              name="Google"
            />
            <IntegrationRow
              icon={<Icon icon="vscode-icons:file-type-outlook" size={24} />}
              name="Outlook"
            />
            <Divider text="Directly connecting Google/Outlook works better" />
            <IntegrationRow
              icon={<Icon icon="logos:apple" size={24} />}
              name="Apple"
            />
          </>
        ) : (
          <>
            <IntegrationRow
              icon={<Icon icon="logos:apple" size={24} />}
              name="Apple"
            />
            <Divider text="You need account" />
            <IntegrationRow
              icon={<Icon icon="logos:google-calendar" size={24} />}
              name="Google"
              disabled
            />
            <IntegrationRow
              icon={<Icon icon="vscode-icons:file-type-outlook" size={24} />}
              name="Outlook"
              disabled
            />
          </>
        )}
      </div>

      <button
        onClick={() => onNavigate({ ...search, step: getNext(search) })}
        className="mt-4 text-sm text-neutral-400 transition-colors hover:text-neutral-600"
      >
        skip
      </button>
    </OnboardingContainer>
  );
}
