import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { open } from "@tauri-apps/plugin-shell";

import { client, getApiDesktopUserIntegrationsOptions, getIntegrationURL } from "@/client";
import { type CalendarIntegration } from "@/types";
import { Button } from "@hypr/ui/components/ui/button";
import { GoogleIcon, OutlookIcon } from "./calendar-icon-with-text";

export function CloudCalendarIntegrationDetails({
  type,
}: {
  type: Exclude<CalendarIntegration, "apple-calendar">;
}) {
  const integrations = useQuery({
    ...getApiDesktopUserIntegrationsOptions({ client }),
  });

  const integration = integrations.data?.find((i) => i === type);
  const Icon = type === "google-calendar" ? GoogleIcon : OutlookIcon;

  const handleClickConnect = () => {
    const url = getIntegrationURL(type);
    open(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center">
            <Icon />
          </div>
          <div>
            <div className="text-sm font-medium">
              <Trans>
                {type === "google-calendar"
                  ? "Google Calendar"
                  : "Outlook Calendar"}
              </Trans>
            </div>
            <div className="text-xs text-muted-foreground">
              {integration ? <Trans>Calendar connected</Trans> : (
                <Trans>
                  Connect your {type === "google-calendar" ? "Google" : "Outlook"} calendar to track upcoming events
                </Trans>
              )}
            </div>
          </div>
        </div>
        <div>
          {integration
            ? (
              "✅"
            )
            : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClickConnect}
                className="min-w-12 text-center"
              >
                <Trans>Connect</Trans>
              </Button>
            )}
        </div>
      </div>
    </div>
  );
}
