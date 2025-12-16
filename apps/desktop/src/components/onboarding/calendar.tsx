import { Icon } from "@iconify-icon/react";
import { platform } from "@tauri-apps/plugin-os";

import { useAuth } from "../../auth";
import type { OnboardingStepId } from "./config";
import { Divider, IntegrationRow, OnboardingContainer } from "./shared";

export function Calendars({
  onNavigate,
}: {
  onNavigate: (step: OnboardingStepId | "done") => void;
}) {
  const auth = useAuth();
  const currentPlatform = platform();
  const isLoggedIn = !!auth?.session;

  return (
    <OnboardingContainer title="Connect your calendars to be reminded every time">
      <div className="flex flex-col gap-4">
        {!isLoggedIn ? (
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
        ) : (
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

      <button
        onClick={() =>
          onNavigate(currentPlatform === "macos" ? "permissions" : "done")
        }
        className="mt-4 text-sm text-neutral-400 transition-colors hover:text-neutral-600"
      >
        skip
      </button>
    </OnboardingContainer>
  );
}
