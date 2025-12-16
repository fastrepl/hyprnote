import { useMutation, useQuery } from "@tanstack/react-query";
import { platform } from "@tauri-apps/plugin-os";
import { AlertCircleIcon, ArrowRightIcon, CheckIcon } from "lucide-react";

import {
  commands as permissionsCommands,
  PermissionStatus,
} from "@hypr/plugin-permissions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { PROVIDERS } from "./shared";

export function ConfigureProviders() {
  const isMacos = platform() === "macos";

  const visibleProviders = PROVIDERS.filter(
    (p) => p.platform === "all" || (p.platform === "macos" && isMacos),
  );

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Configure Providers</h3>
      <Accordion type="single" collapsible className="space-y-3">
        {visibleProviders.map((provider) =>
          provider.id === "apple" ? (
            <AppleCalendarProviderCard key={provider.id} />
          ) : (
            <DisabledProviderCard key={provider.id} config={provider} />
          ),
        )}
      </Accordion>
    </div>
  );
}

function useAccessPermission(config: {
  queryKey: string;
  checkPermission: () => Promise<
    | { status: "ok"; data: PermissionStatus }
    | { status: "error"; error: string }
  >;
  requestPermission: () => Promise<unknown>;
  openSettings: () => Promise<unknown>;
}) {
  const status = useQuery({
    queryKey: [config.queryKey],
    queryFn: async () => {
      const result = await config.checkPermission();
      if (result.status === "ok") {
        return result.data;
      }
      return "denied" as PermissionStatus;
    },
    refetchInterval: 1000,
  });

  const requestAccess = useMutation({
    mutationFn: config.requestPermission,
    onSuccess: () => {
      setTimeout(() => status.refetch(), 1000);
    },
  });

  const isAuthorized = status.data === "authorized";
  const isPending = requestAccess.isPending;

  const handleAction = async () => {
    if (isAuthorized) {
      await config.openSettings();
    } else if (status.data === "denied") {
      await config.openSettings();
    } else {
      requestAccess.mutate();
    }
  };

  return { isAuthorized, isPending, handleAction };
}

function AccessPermissionRow({
  title,
  grantedDescription,
  requestDescription,
  isAuthorized,
  isPending,
  onAction,
}: {
  title: string;
  grantedDescription: string;
  requestDescription: string;
  isAuthorized: boolean;
  isPending: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex-1">
        <div
          className={cn([
            "flex items-center gap-2 mb-1",
            !isAuthorized && "text-red-500",
          ])}
        >
          {!isAuthorized && <AlertCircleIcon className="size-4" />}
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <p className="text-xs text-neutral-600">
          {isAuthorized ? grantedDescription : requestDescription}
        </p>
      </div>
      <Button
        variant={isAuthorized ? "outline" : "default"}
        size="icon"
        onClick={onAction}
        disabled={isPending}
        className={cn([
          "size-8",
          isAuthorized && "bg-stone-100 text-stone-800 hover:bg-stone-200",
        ])}
        aria-label={
          isAuthorized
            ? `Open ${title.toLowerCase()} settings`
            : `Request ${title.toLowerCase()}`
        }
      >
        {isAuthorized ? (
          <CheckIcon className="size-5" />
        ) : (
          <ArrowRightIcon className="size-5" />
        )}
      </Button>
    </div>
  );
}

function AppleCalendarProviderCard() {
  const config = PROVIDERS.find((p) => p.id === "apple")!;

  const calendar = useAccessPermission({
    queryKey: "appleCalendarAccess",
    checkPermission: permissionsCommands.checkCalendarPermission,
    requestPermission: permissionsCommands.requestCalendarPermission,
    openSettings: permissionsCommands.openCalendarSettings,
  });

  const contacts = useAccessPermission({
    queryKey: "appleContactsAccess",
    checkPermission: permissionsCommands.checkContactsPermission,
    requestPermission: permissionsCommands.requestContactsPermission,
    openSettings: permissionsCommands.openContactsSettings,
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
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <div className="flex flex-col divide-y">
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
      </AccordionContent>
    </AccordionItem>
  );
}

function DisabledProviderCard({
  config,
}: {
  config: (typeof PROVIDERS)[number];
}) {
  return (
    <AccordionItem
      disabled
      value={config.id}
      className="rounded-xl border-2 border-dashed bg-neutral-50"
    >
      <AccordionTrigger
        className={cn([
          "capitalize gap-2 px-4",
          "cursor-not-allowed opacity-50",
        ])}
      >
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
    </AccordionItem>
  );
}
