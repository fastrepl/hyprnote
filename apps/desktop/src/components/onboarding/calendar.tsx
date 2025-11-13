import { Icon } from "@iconify-icon/react";

import { Divider, IntegrationRow, OnboardingContainer, type OnboardingNext } from "./shared";

type CalendarsProps = {
  local: boolean;
  onNext: OnboardingNext;
};

export function Calendars({ local, onNext }: CalendarsProps) {
  return (
    <OnboardingContainer
      title="Connect your calendars to be reminded every time"
      action={{ kind: "skip", onClick: () => onNext() }}
    >
      <div className="flex flex-col gap-4">
        {local
          ? (
            <>
              <IntegrationRow
                icon={<Icon icon="logos:google-calendar" size={24} />}
                name="Google Calendar"
              />
              <IntegrationRow
                icon={<Icon icon="vscode-icons:file-type-outlook" size={24} />}
                name="Outlook"
              />
              <Divider text="Directly connecting Google/Outlook works better" />
              <IntegrationRow
                icon={<Icon icon="logos:apple" size={24} />}
                name="Apple Calendar"
              />
            </>
          )
          : (
            <>
              <IntegrationRow
                icon={<Icon icon="logos:apple" size={24} />}
                name="Apple Calendar"
              />
              <Divider text="You need account" />
              <IntegrationRow
                icon={<Icon icon="logos:google-calendar" size={24} />}
                name="Google Calendar"
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
    </OnboardingContainer>
  );
}
