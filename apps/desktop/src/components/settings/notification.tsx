import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { commands as detectCommands } from "@hypr/plugin-detect";
import { commands as notificationCommands } from "@hypr/plugin-notification";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@hypr/ui/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Switch } from "@hypr/ui/components/ui/switch";
import { cn } from "@hypr/utils";
import { useConfigValues } from "../../config/use-config";
import * as main from "../../store/tinybase/main";

export function SettingsNotifications() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [newAppName, setNewAppName] = useState("");

  const configs = useConfigValues(
    [
      "notification_event",
      "notification_detect",
      "respect_dnd",
      "ignored_platforms",
      "quit_intercept",
    ] as const,
  );

  useEffect(() => {
    notificationCommands.clearNotifications();
    return () => {
      notificationCommands.clearNotifications();
    };
  }, []);

  const { data: allInstalledApps } = useQuery({
    queryKey: ["settings", "all-installed-applications"],
    queryFn: detectCommands.listInstalledApplications,
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const { data: defaultIgnoredBundleIds } = useQuery({
    queryKey: ["settings", "default-ignored-bundle-ids"],
    queryFn: detectCommands.listDefaultIgnoredBundleIds,
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const bundleIdToName = (bundleId: string) => {
    return allInstalledApps?.find(a => a.id === bundleId)?.name ?? bundleId;
  };

  const nameToBundleId = (name: string) => {
    return allInstalledApps?.find(a => a.name === name)?.id ?? name;
  };

  const isDefaultIgnored = (appName: string) => {
    const bundleId = nameToBundleId(appName);
    return defaultIgnoredBundleIds?.includes(bundleId) ?? false;
  };

  const handleSetNotificationEvent = main.UI.useSetValueCallback(
    "notification_event",
    (value: boolean) => value,
    [],
    main.STORE_ID,
  );

  const handleSetNotificationDetect = main.UI.useSetValueCallback(
    "notification_detect",
    (value: boolean) => value,
    [],
    main.STORE_ID,
  );

  const handleSetRespectDnd = main.UI.useSetValueCallback(
    "respect_dnd",
    (value: boolean) => value,
    [],
    main.STORE_ID,
  );

  const handleSetIgnoredPlatforms = main.UI.useSetValueCallback(
    "ignored_platforms",
    (value: string) => value,
    [],
    main.STORE_ID,
  );

  const handleSetQuitIntercept = main.UI.useSetValueCallback(
    "quit_intercept",
    (value: boolean) => value,
    [],
    main.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      notification_event: configs.notification_event,
      notification_detect: configs.notification_detect,
      respect_dnd: configs.respect_dnd,
      ignored_platforms: configs.ignored_platforms.map(bundleIdToName),
      quit_intercept: configs.quit_intercept,
    },
    listeners: {
      onChange: async ({ formApi }) => {
        const anyEnabled = formApi.getFieldValue("notification_event") || formApi.getFieldValue("notification_detect");
        formApi.setFieldValue("quit_intercept", anyEnabled);
        formApi.handleSubmit();
      },
    },
    onSubmit: async ({ value }) => {
      handleSetNotificationEvent(value.notification_event);
      handleSetNotificationDetect(value.notification_detect);
      handleSetRespectDnd(value.respect_dnd);
      handleSetIgnoredPlatforms(JSON.stringify(value.ignored_platforms.map(nameToBundleId)));
      handleSetQuitIntercept(value.quit_intercept);
    },
  });

  const anyNotificationEnabled = configs.notification_event || configs.notification_detect;
  const ignoredPlatforms = form.getFieldValue("ignored_platforms");

  const installedApps = allInstalledApps?.map(app => app.name) ?? [];

  const handleAddIgnoredApp = (appName: string) => {
    const trimmedName = appName.trim();
    if (!trimmedName || ignoredPlatforms.includes(trimmedName) || isDefaultIgnored(trimmedName)) {
      return;
    }

    form.setFieldValue("ignored_platforms", [...ignoredPlatforms, trimmedName]);
    setNewAppName("");
    setPopoverOpen(false);
  };

  const handleRemoveIgnoredApp = (app: string) => {
    form.setFieldValue("ignored_platforms", ignoredPlatforms.filter((a: string) => a !== app));
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mb-4 font-semibold">Notifications</h2>
        <div className="space-y-6">
          <form.Field name="notification_event">
            {(field) => (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="mb-1 text-sm font-medium">Event notifications (Not-available)</h3>
                  <p className="text-xs text-neutral-600">Get notified about upcoming calendar events</p>
                </div>
                <Switch checked={false} onCheckedChange={field.handleChange} disabled />
              </div>
            )}
          </form.Field>

          <form.Field name="notification_detect">
            {(field) => (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="mb-1 text-sm font-medium">Microphone detection</h3>
                    <p className="text-xs text-neutral-600">
                      Automatically detect when a meeting starts based on microphone activity.
                    </p>
                  </div>
                  <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                </div>

                {field.state.value && (
                  <div className={cn(["ml-6 border-l-2 border-muted pl-6 pt-2"])}>
                    <div className="mb-3 space-y-1">
                      <h4 className="text-sm font-medium">Exclude apps from detection</h4>
                      <p className="text-xs text-neutral-600">These apps will not trigger detection.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="min-h-[38px] flex-1 flex-wrap gap-2 rounded-md border p-2 flex">
                        {ignoredPlatforms.map((app: string) => {
                          const isDefault = isDefaultIgnored(app);
                          return (
                            <Badge
                              key={app}
                              variant="secondary"
                              className={cn([
                                "flex items-center gap-1 px-2 py-0.5 text-xs",
                                isDefault ? ["bg-neutral-200 text-neutral-700"] : ["bg-muted"],
                              ])}
                              title={isDefault ? "default" : undefined}
                            >
                              {app}
                              {isDefault && <span className="text-[10px] opacity-70">(default)</span>}
                              {!isDefault && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="ml-0.5 h-3 w-3 p-0 hover:bg-transparent"
                                  onClick={() => handleRemoveIgnoredApp(app)}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" size="icon" className="h-[38px] w-[38px]">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[220px] p-0" align="end">
                          <Command>
                            <CommandInput
                              placeholder="Enter app name..."
                              className="h-9"
                              value={newAppName}
                              onValueChange={setNewAppName}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddIgnoredApp(newAppName);
                                }
                              }}
                            />
                            <CommandEmpty>
                              {newAppName
                                ? (
                                  <button
                                    className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => handleAddIgnoredApp(newAppName)}
                                  >
                                    Add "{newAppName}"
                                  </button>
                                )
                                : "Type an app name to add"}
                            </CommandEmpty>
                            <CommandGroup className="max-h-[200px] overflow-auto">
                              {installedApps
                                .filter(app => !ignoredPlatforms.includes(app))
                                .map((app) => {
                                  const isDefault = isDefaultIgnored(app);
                                  return (
                                    <CommandItem
                                      key={app}
                                      onSelect={() => !isDefault && handleAddIgnoredApp(app)}
                                      disabled={isDefault}
                                      className={cn([isDefault && ["opacity-50 cursor-not-allowed"]])}
                                    >
                                      <span className="flex items-center gap-2">
                                        {app}
                                        {isDefault && (
                                          <span className="text-[10px] text-muted-foreground">
                                            (default)
                                          </span>
                                        )}
                                      </span>
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>
            )}
          </form.Field>

          <div className="space-y-6">
            <div className="relative flex items-center pt-4 pb-2">
              <div className="w-full border-t border-muted" />
              <span className="absolute left-1/2 -translate-x-1/2 bg-background px-4 text-xs font-medium text-muted-foreground">
                For enabled notifications
              </span>
            </div>

            <form.Field name="quit_intercept">
              {(field) => (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="mb-1 text-sm font-medium">Quit intercept (Read-only)</h3>
                    <p className="text-xs text-neutral-600">
                      Prevents Hyprnote from quitting, which is required for notifications to work.
                    </p>
                  </div>
                  <Switch checked={field.state.value} onCheckedChange={field.handleChange} disabled />
                </div>
              )}
            </form.Field>

            <form.Field name="respect_dnd">
              {(field) => (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="mb-1 text-sm font-medium">Respect Do-Not-Disturb mode</h3>
                    <p className="text-xs text-neutral-600">
                      Don't show notifications when Do-Not-Disturb is enabled on your system
                    </p>
                  </div>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                    disabled={!anyNotificationEnabled}
                  />
                </div>
              )}
            </form.Field>
          </div>
        </div>
      </div>
    </div>
  );
}
