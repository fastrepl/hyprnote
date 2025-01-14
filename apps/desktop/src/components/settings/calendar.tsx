import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Trans } from "@lingui/react/macro";
import { ArrowUpRight, CircleCheck, XIcon } from "lucide-react";
import { RiAppleFill as AppleIcon } from "@remixicon/react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";

import { useHypr } from "@/contexts";
import { type Calendar, commands } from "@/types/tauri";
import type { CalendarIntegration } from "@/types";

const supportedIntegrations: CalendarIntegration[] = [
  "apple-calendar",
  "google-calendar",
];

export default function Calendar() {
  const queryClient = useQueryClient();

  const calendars = useQuery({
    queryKey: ["settings", "calendars"],
    queryFn: async () => {
      const calendars = await commands.dbListCalendars();
      return calendars;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({
      calendar_id,
      selected,
    }: {
      calendar_id: Calendar["id"];
      selected: boolean;
    }) => {
      const calendar = calendars.data?.find(
        (calendar) => calendar.id === calendar_id,
      );
      if (calendar) {
        commands.dbUpsertCalendar({ ...calendar, selected });
        queryClient.invalidateQueries({ queryKey: ["settings", "calendars"] });
      }
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 font-semibold">
          <Trans>Integrations</Trans>
        </h2>
        <ul className="flex flex-col gap-3">
          {supportedIntegrations.map((type, i) => (
            <li key={i}>
              <Integration type={type} connected={false} />
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Selected</h2>
        <ul className="flex flex-col gap-2">
          {(calendars.data ?? [])
            .filter((calendar) => calendar.selected)
            .map((calendar, i) => (
              <li key={i} className="flex flex-row justify-between">
                <div className="flex flex-row items-center gap-1">
                  <span>{calendar.name}</span>
                </div>
                <button>
                  <XIcon
                    size={16}
                    onClick={() =>
                      mutation.mutate({
                        calendar_id: calendar.id,
                        selected: false,
                      })
                    }
                  />
                </button>
              </li>
            ))}
        </ul>

        <Select
          onValueChange={(id) =>
            mutation.mutate({ calendar_id: id, selected: true })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {(calendars.data ?? [])
              .filter((calendar) => !calendar.selected)
              .map((calendar, i) => (
                <SelectItem key={i} value={calendar.id}>
                  {calendar.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
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
  const { client } = useHypr();
  const navigate = useNavigate();

  useQuery({
    queryKey: ["settings", "integration"],
    queryFn: async () => {
      const integrations = await client.listIntegrations();
      return integrations;
    },
  });

  const handleClick = useCallback(() => {
    if (type === "apple-calendar") {
      commands.openPermissionSettings("calendar");
    } else {
      const href = client.getIntegrationURL(type);
      navigate({ href });
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
          {type === "apple-calendar"
            ? "Apple"
            : type === "google-calendar"
              ? "Google"
              : type === "outlook-calendar"
                ? "Outlook"
                : null}
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
