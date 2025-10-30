import { useForm } from "@tanstack/react-form";
import { Plus, X } from "lucide-react";
import { useState } from "react";

import { commands as notificationCommands, type InstalledApp } from "@hypr/plugin-notification";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@hypr/ui/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Switch } from "@hypr/ui/components/ui/switch";
import { cn } from "@hypr/utils";
import * as main from "../../store/tinybase/main";

export function SettingsNotifications() {
  const values = main.UI.useValues(main.STORE_ID);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [applications, setApplications] = useState<string[]>([]);

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
    (value: string[]) => JSON.stringify(value),
    [],
    main.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      notification_event: values.notification_event ?? false,
      notification_detect: values.notification_detect ?? false,
      respect_dnd: values.respect_dnd ?? true,
      ignored_platforms: (values.ignored_platforms ? JSON.parse(String(values.ignored_platforms)) : []) as string[],
    },
    listeners: {
      onChange: async ({ formApi }) => {
        formApi.handleSubmit();
      },
    },
    onSubmit: async ({ value }) => {
      handleSetNotificationEvent(value.notification_event);
      handleSetNotificationDetect(value.notification_detect);
      handleSetRespectDnd(value.respect_dnd);
      handleSetIgnoredPlatforms(value.ignored_platforms);

      if (value.notification_event) {
        await notificationCommands.startEventNotification({
          respect_do_not_disturb: value.respect_dnd,
        });
      } else {
        await notificationCommands.stopEventNotification();
      }

      if (value.notification_detect) {
        await notificationCommands.startDetectNotification({
          respect_do_not_disturb: value.respect_dnd,
          ignored_platforms: value.ignored_platforms,
        });
      } else {
        await notificationCommands.stopDetectNotification();
      }
    },
  });

  const loadApplications = async () => {
    if (applications.length === 0) {
      const apps = await notificationCommands.listApplications();
      const uniqueNames = Array.from(new Set(apps.map((app: InstalledApp) => app.name))) as string[];
      setApplications(uniqueNames);
    }
  };

  const handleAddIgnoredApp = (appName: string) => {
    const trimmedName = appName.trim();
    if (trimmedName) {
      const currentIgnored = form.getFieldValue("ignored_platforms");
      if (!currentIgnored.includes(trimmedName)) {
        form.setFieldValue("ignored_platforms", [...currentIgnored, trimmedName]);
      }
      setNewAppName("");
      setPopoverOpen(false);
    }
  };

  const handleRemoveIgnoredApp = (app: string) => {
    const currentIgnored = form.getFieldValue("ignored_platforms");
    form.setFieldValue("ignored_platforms", currentIgnored.filter(a => a !== app));
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-semibold mb-4">Notifications</h2>
        <div className="space-y-6">
          <form.Field name="notification_event">
            {(field) => (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-medium mb-1">Event notifications</h3>
                  <p className="text-xs text-neutral-600">Get notified about upcoming calendar events</p>
                </div>
                <Switch
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="notification_detect">
            {(field) => (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium mb-1">Audio detection</h3>
                    <p className="text-xs text-neutral-600">
                      Automatically detect and notify when audio/meeting starts
                    </p>
                  </div>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                  />
                </div>

                {field.state.value && (
                  <div className={cn(["ml-6 border-l-2 border-muted pl-6 pt-2"])}>
                    <div className="space-y-1 mb-3">
                      <h4 className="text-sm font-medium">Exclude apps from detection</h4>
                      <p className="text-xs text-neutral-600">
                        These apps will not trigger meeting detection
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex flex-wrap gap-2 min-h-[38px] p-2 border rounded-md">
                        {form.getFieldValue("ignored_platforms").map((app) => (
                          <Badge
                            key={app}
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted"
                          >
                            {app}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-3 w-3 p-0 hover:bg-transparent ml-0.5"
                              onClick={() => handleRemoveIgnoredApp(app)}
                            >
                              <X className="h-2.5 w-2.5" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                      <Popover
                        open={popoverOpen}
                        onOpenChange={(open) => {
                          setPopoverOpen(open);
                          if (open) {
                            loadApplications();
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-[38px] w-[38px]"
                          >
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
                                    className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => handleAddIgnoredApp(newAppName)}
                                  >
                                    Add "{newAppName}"
                                  </button>
                                )
                                : (
                                  "Type an app name to add"
                                )}
                            </CommandEmpty>
                            <CommandGroup className="max-h-[200px] overflow-auto">
                              {applications
                                .filter(app => !form.getFieldValue("ignored_platforms").includes(app))
                                .map((app) => (
                                  <CommandItem
                                    key={app}
                                    onSelect={() => handleAddIgnoredApp(app)}
                                  >
                                    {app}
                                  </CommandItem>
                                ))}
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

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-4 text-muted-foreground font-medium">
                Global Settings
              </span>
            </div>
          </div>

          <form.Field name="respect_dnd">
            {(field) => {
              const hasAnyNotificationEnabled = form.getFieldValue("notification_event")
                || form.getFieldValue("notification_detect");

              return (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium mb-1">Respect Do Not Disturb</h3>
                    <p className="text-xs text-neutral-600">
                      Don't show notifications when Do Not Disturb is enabled on your system
                    </p>
                  </div>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                    disabled={!hasAnyNotificationEnabled}
                  />
                </div>
              );
            }}
          </form.Field>
        </div>
      </div>
    </div>
  );
}
