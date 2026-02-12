import { Icon } from "@iconify-icon/react";
import type { ReactNode } from "react";
import { useState } from "react";

import { OutlookIcon } from "@hypr/ui/components/icons/outlook";
import { cn } from "@hypr/utils";

import { usePermission } from "../../hooks/usePermissions";
import { useAppleCalendarSelection } from "../settings/calendar/configure/apple/calendar-selection";
import { SyncProvider } from "../settings/calendar/configure/apple/context";
import { AccessPermissionRow } from "../settings/calendar/configure/apple/permission";
import { CalendarSelection } from "../settings/calendar/configure/shared";

const PROVIDERS = [
  {
    id: "apple",
    label: "Apple",
    icon: <Icon icon="logos:apple" width={16} height={16} />,
    disabled: false,
  },
  {
    id: "google",
    label: "Google",
    icon: <Icon icon="logos:google-calendar" width={16} height={16} />,
    disabled: true,
  },
  {
    id: "outlook",
    label: "Outlook",
    icon: <OutlookIcon size={16} />,
    disabled: true,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  icon: ReactNode;
  disabled: boolean;
}[];

type ProviderId = (typeof PROVIDERS)[number]["id"];

function BareAppleCalendarSelection() {
  const { groups, handleToggle } = useAppleCalendarSelection();
  return <CalendarSelection groups={groups} onToggle={handleToggle} />;
}

export function CalendarSection({ onContinue }: { onContinue: () => void }) {
  const [provider, setProvider] = useState<ProviderId>("apple");
  const calendar = usePermission("calendar");
  const contacts = usePermission("contacts");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            disabled={p.disabled}
            onClick={() => setProvider(p.id)}
            className={cn([
              "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              provider === p.id
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500",
              p.disabled
                ? "cursor-not-allowed opacity-40"
                : "hover:text-neutral-700",
            ])}
          >
            {p.icon}
            <span>{p.label}</span>
            {p.disabled && (
              <span className="text-[10px] text-neutral-400">(soon)</span>
            )}
          </button>
        ))}
      </div>

      {provider === "apple" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <AccessPermissionRow
              title="Calendar"
              status={calendar.status}
              isPending={calendar.isPending}
              onOpen={calendar.open}
              onRequest={calendar.request}
              onReset={calendar.reset}
            />
            <AccessPermissionRow
              title="Contacts"
              status={contacts.status}
              isPending={contacts.isPending}
              onOpen={contacts.open}
              onRequest={contacts.request}
              onReset={contacts.reset}
            />
          </div>

          <SyncProvider>
            <BareAppleCalendarSelection />
          </SyncProvider>
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full py-3 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
      >
        Continue
      </button>
    </div>
  );
}
