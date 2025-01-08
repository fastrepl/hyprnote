import { useQuery } from "@tanstack/react-query";
import { commands } from "@/types/tauri";

import { XIcon } from "lucide-react";
import {
  RiAppleFill as AppleIcon,
  RiGoogleFill as GoogleIcon,
} from "@remixicon/react";

export default function Calendar() {
  const { data, isLoading } = useQuery({
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
              <GoogleIcon size={16} />
              <span>Google</span>
            </div>
          </li>
        </ul>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Selected</h2>
        <ul className="flex flex-col gap-2">
          {(data ?? []).map((calendar) => (
            <li className="flex flex-row justify-between">
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
