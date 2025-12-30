import { openUrl } from "@tauri-apps/plugin-opener";

import { commands as permissionsCommands } from "@hypr/plugin-permissions";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";

import { StyledStreamdown } from "../../../ai/shared";
import { PROVIDERS } from "../../shared";
import { AppleCalendarSelection } from "./calendar-selection";
import { SyncProvider } from "./context";
import { AccessPermissionRow, useAccessPermission } from "./permission";

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-t border-neutral-200 pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
          {title}
        </h4>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AppleCalendarProviderCard() {
  const config = PROVIDERS.find((p) => p.id === "apple")!;

  const calendar = useAccessPermission({
    queryKey: "appleCalendarAccess",
    checkPermission: () => permissionsCommands.checkPermission("calendar"),
    requestPermission: () => permissionsCommands.requestPermission("calendar"),
    openSettings: () => permissionsCommands.openPermission("calendar"),
  });

  const contacts = useAccessPermission({
    queryKey: "appleContactsAccess",
    checkPermission: () => permissionsCommands.checkPermission("contacts"),
    requestPermission: () => permissionsCommands.requestPermission("contacts"),
    openSettings: () => permissionsCommands.openPermission("contacts"),
  });

  return (
    <AccordionItem
      value={config.id}
      className="rounded-xl border-2 border-dashed bg-neutral-50"
    >
      <AccordionTrigger className="capitalize gap-2 px-4">
        <div className="flex items-center gap-2">
          {config.icon}
          <span>{config.displayName}</span>
          {config.badge && (
            <span className="text-xs text-neutral-500 font-light border border-neutral-300 rounded-full px-2">
              {config.badge}
            </span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 space-y-5">
        <div className="flex items-center justify-between">
          <StyledStreamdown>
            Sync events from your **macOS Calendar** app. Requires calendar and
            contacts permissions.
          </StyledStreamdown>
          <button
            onClick={() => openUrl(config.docsPath)}
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Docs ↗
          </button>
        </div>

        <Section title="Permissions">
          <div className="space-y-1">
            <AccessPermissionRow
              title="Calendar Access"
              grantedDescription="Permission granted. Click to open settings."
              requestDescription="Grant access to sync events from your Apple Calendar"
              isAuthorized={calendar.isAuthorized}
              isPending={calendar.isPending}
              onAction={calendar.handleAction}
            />
            <AccessPermissionRow
              title="Contacts Access"
              grantedDescription="Permission granted. Click to open settings."
              requestDescription="Grant access to match participants with your contacts"
              isAuthorized={contacts.isAuthorized}
              isPending={contacts.isPending}
              onAction={contacts.handleAction}
            />
          </div>
        </Section>

        {calendar.isAuthorized && (
          <SyncProvider>
            <AppleCalendarSelection />
          </SyncProvider>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
