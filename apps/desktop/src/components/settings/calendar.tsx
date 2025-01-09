import { useQuery } from "@tanstack/react-query";
import { commands } from "@/types/tauri";

import { XIcon } from "lucide-react";
import { RiAppleFill as AppleIcon } from "@remixicon/react";

export default function Calendar() {
  const calendars = useQuery({
    queryKey: ["settings", "calendars"],
    queryFn: () => commands.dbListCalendars(),
  });

  return (
    <div className="flex flex-col gap-6 px-8">
      <div>
        <h2 className="mb-2 font-semibold">Integrations</h2>
        <ul className="flex flex-col gap-2">
          <li className="flex flex-row justify-between">
            <div className="flex flex-row items-center gap-1">
              <AppleIcon size={16} />
              <span>Apple</span>
            </div>
          </li>
          <li className="flex flex-row justify-between">
            <div className="flex flex-row items-center gap-1">
              <img
                className="h-4 w-4"
                src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg"
              />
              <span>Google</span>
            </div>
          </li>

          <li className="flex flex-row justify-between">
            <div className="flex flex-row items-center gap-1">
              <img
                className="h-4 w-4"
                src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg"
              />
              <span>Outlook</span>
            </div>
          </li>
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
