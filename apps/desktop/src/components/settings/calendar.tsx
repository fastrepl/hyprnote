import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trans } from "@lingui/react/macro";

import { ArrowUpRight, CircleCheck, XIcon } from "lucide-react";
import { RiAppleFill as AppleIcon } from "@remixicon/react";

import { commands } from "@/types/tauri";
import { useNavigate } from "@tanstack/react-router";
import { useServer } from "@/contexts";

import { NangoIntegration } from "@/types/server"

type CalendarIntegration = Exclude<NangoIntegration, "outlook-calendar"> | "apple-calendar";
const supportedIntegrations: CalendarIntegration[] = ["apple-calendar", "google-calendar"];

export default function Calendar() {
  const calendars = useQuery({
    queryKey: ["settings", "calendars"],
    queryFn: () => commands.dbListCalendars(),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 font-semibold">
          <Trans>Integrations</Trans>
        </h2>
        <ul className="flex flex-col gap-3">
          {supportedIntegrations.map((type) => (
            <li>
              <Integration
                type={type}
                connected={false}
              />
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Selected</h2>
        <ul className="flex flex-col gap-2">
          {(calendars.data ?? []).map((calendar, i) => (
            <li key={i} className="flex flex-row justify-between">
              <div className="flex flex-row items-center gap-1">
                <span>{calendar.name}</span>
              </div>
              <button>
                <XIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <img
      className="h-4 w-4"
      src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg"
    />
  );
}

function OutlookIcon() {
  return (
    <img
      className="h-4 w-4"
      src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg"
    />
  );
}

interface IntegrationProps {
  type: CalendarIntegration;
  connected: boolean;
}
function Integration({ type, connected }: IntegrationProps) {
  const { base, fetch } = useServer();
  const navigate = useNavigate();

  useQuery({
    queryKey: ["settings", "calendars"],
    queryFn: () => fetch("/api/native/integration/list"),
  });

  const handleClick = useCallback(() => {
    if (type === "apple-calendar") {
      commands.openPermissionSettings("contacts");
    } else {
      navigate({ href: new URL(`/integrations/calendar/${type}`, base).toString() });
    }
  }, [type]);

  return (
    <div className="flex flex-row justify-between">
      <div className="flex flex-row items-center gap-2">
        {type === "apple-calendar" ? (
          <AppleIcon size={16} />
        ) : type === "google-calendar" ? (
          <GoogleIcon />
        ) : (
          <OutlookIcon />
        )}
        <span className="text-sm">
          {type === "apple-calendar" ? "Apple" : type === "google-calendar" ? "Google" : "Outlook"}
          </span>
      </div>
      <button onClick={handleClick}>
        {connected ? (
          <CircleCheck size={16} color="green" />
        ) : (
          <ArrowUpRight
            size={16}
            className="text-gray-400 hover:text-gray-900"
          />
        )}
      </button>
    </div>
  );
}
