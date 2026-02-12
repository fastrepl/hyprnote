import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  commands as detectCommands,
  type InstalledApp,
  type Result,
} from "@hypr/plugin-detect";
import { commands as notificationCommands } from "@hypr/plugin-notification";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Switch } from "@hypr/ui/components/ui/switch";
import { cn } from "@hypr/utils";

import { useConfigValues } from "../../../config/use-config";
import * as settings from "../../../store/tinybase/store/settings";

export function NotificationSettingsView() {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const configs = useConfigValues([
    "notification_event",
    "notification_detect",
    "respect_dnd",
    "ignored_platforms",
    "event_notify_before_minutes",
    "event_notification_timeout_secs",
    "mic_detection_delay_secs",
    "mic_notification_timeout_secs",
  ] as const);

  useEffect(() => {
    void notificationCommands.clearNotifications();
    return () => {
      void notificationCommands.clearNotifications();
    };
  }, []);

  const { data: allInstalledApps } = useQuery({
    queryKey: ["settings", "all-installed-applications"],
    queryFn: detectCommands.listInstalledApplications,
    select: (result: Result<InstalledApp[], string>) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const { data: defaultIgnoredBundleIds } = useQuery({
    queryKey: ["settings", "default-ignored-bundle-ids"],
    queryFn: detectCommands.listDefaultIgnoredBundleIds,
    select: (result: Result<string[], string>) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const bundleIdToName = (bundleId: string) => {
    return allInstalledApps?.find((a) => a.id === bundleId)?.name ?? bundleId;
  };

  const nameToBundleId = (name: string) => {
    return allInstalledApps?.find((a) => a.name === name)?.id ?? name;
  };

  const isDefaultIgnored = (appName: string) => {
    const bundleId = nameToBundleId(appName);
    return defaultIgnoredBundleIds?.includes(bundleId) ?? false;
  };

  const handleSetNotificationEvent = settings.UI.useSetValueCallback(
    "notification_event",
    (value: boolean) => value,
    [],
    settings.STORE_ID,
  );

  const handleSetNotificationDetect = settings.UI.useSetValueCallback(
    "notification_detect",
    (value: boolean) => value,
    [],
    settings.STORE_ID,
  );

  const handleSetRespectDnd = settings.UI.useSetValueCallback(
    "respect_dnd",
    (value: boolean) => value,
    [],
    settings.STORE_ID,
  );

  const handleSetIgnoredPlatforms = settings.UI.useSetValueCallback(
    "ignored_platforms",
    (value: string) => value,
    [],
    settings.STORE_ID,
  );

  const handleSetEventNotifyBeforeMinutes = settings.UI.useSetValueCallback(
    "event_notify_before_minutes",
    (value: number) => value,
    [],
    settings.STORE_ID,
  );

  const handleSetEventNotificationTimeoutSecs = settings.UI.useSetValueCallback(
    "event_notification_timeout_secs",
    (value: number) => value,
    [],
    settings.STORE_ID,
  );

  const handleSetMicDetectionDelaySecs = settings.UI.useSetValueCallback(
    "mic_detection_delay_secs",
    (value: number) => value,
    [],
    settings.STORE_ID,
  );

  const handleSetMicNotificationTimeoutSecs = settings.UI.useSetValueCallback(
    "mic_notification_timeout_secs",
    (value: number) => value,
    [],
    settings.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      notification_event: configs.notification_event,
      notification_detect: configs.notification_detect,
      respect_dnd: configs.respect_dnd,
      ignored_platforms: configs.ignored_platforms.map(bundleIdToName),
      event_notify_before_minutes: configs.event_notify_before_minutes,
      event_notification_timeout_secs: configs.event_notification_timeout_secs,
      mic_detection_delay_secs: configs.mic_detection_delay_secs,
      mic_notification_timeout_secs: configs.mic_notification_timeout_secs,
    },
    listeners: {
      onChange: async ({ formApi }) => {
        void formApi.handleSubmit();
      },
    },
    onSubmit: async ({ value }) => {
      handleSetNotificationEvent(value.notification_event);
      handleSetNotificationDetect(value.notification_detect);
      handleSetRespectDnd(value.respect_dnd);
      handleSetIgnoredPlatforms(
        JSON.stringify(value.ignored_platforms.map(nameToBundleId)),
      );
      handleSetEventNotifyBeforeMinutes(value.event_notify_before_minutes);
      handleSetEventNotificationTimeoutSecs(
        value.event_notification_timeout_secs,
      );
      handleSetMicDetectionDelaySecs(value.mic_detection_delay_secs);
      handleSetMicNotificationTimeoutSecs(value.mic_notification_timeout_secs);
    },
  });

  const anyNotificationEnabled =
    configs.notification_event || configs.notification_detect;
  const ignoredPlatforms = form.getFieldValue("ignored_platforms");

  const installedApps = allInstalledApps?.map((app) => app.name) ?? [];

  const filteredApps = installedApps.filter((app) => {
    const matchesSearch = app.toLowerCase().includes(inputValue.toLowerCase());
    const notAlreadyAdded = !ignoredPlatforms.includes(app);
    const notDefaultIgnored = !isDefaultIgnored(app);
    return matchesSearch && notAlreadyAdded && notDefaultIgnored;
  });

  const showCustomOption =
    inputValue.trim() &&
    !filteredApps.some((app) => app.toLowerCase() === inputValue.toLowerCase());

  const dropdownOptions = showCustomOption
    ? [inputValue.trim(), ...filteredApps]
    : filteredApps;

  const handleAddIgnoredApp = (appName: string) => {
    const trimmedName = appName.trim();
    if (
      !trimmedName ||
      ignoredPlatforms.includes(trimmedName) ||
      isDefaultIgnored(trimmedName)
    ) {
      return;
    }

    form.setFieldValue("ignored_platforms", [...ignoredPlatforms, trimmedName]);
    void form.handleSubmit();
    setInputValue("");
    setShowDropdown(false);
    setSelectedIndex(0);
  };

  const handleRemoveIgnoredApp = (app: string) => {
    const updated = ignoredPlatforms.filter((a: string) => a !== app);
    form.setFieldValue("ignored_platforms", updated);
    void form.handleSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (dropdownOptions.length > 0) {
        handleAddIgnoredApp(dropdownOptions[selectedIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < dropdownOptions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setSelectedIndex(0);
    } else if (
      e.key === "Backspace" &&
      !inputValue &&
      ignoredPlatforms.length > 0
    ) {
      const lastApp = ignoredPlatforms[ignoredPlatforms.length - 1];
      if (!isDefaultIgnored(lastApp)) {
        handleRemoveIgnoredApp(lastApp);
      }
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setShowDropdown(true);
    setSelectedIndex(0);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <form.Field name="notification_event">
        {(field) => (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="mb-1 text-sm font-medium">
                  Event notifications
                </h3>
                <p className="text-xs text-neutral-600">
                  Get notified before calendar events start
                </p>
              </div>
              <Switch
                checked={field.state.value}
                onCheckedChange={field.handleChange}
              />
            </div>

            {field.state.value && (
              <div
                className={cn([
                  "ml-6 border-l-2 border-muted pl-6 flex flex-col gap-3",
                ])}
              >
                <form.Field name="event_notify_before_minutes">
                  {(subField) => (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-neutral-600">
                        Minutes before event
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        className="w-20 h-7 text-xs"
                        value={subField.state.value}
                        onChange={(e) =>
                          subField.handleChange(Number(e.target.value))
                        }
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="event_notification_timeout_secs">
                  {(subField) => (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-neutral-600">
                        Auto-dismiss after (seconds)
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={300}
                        className="w-20 h-7 text-xs"
                        value={subField.state.value}
                        onChange={(e) =>
                          subField.handleChange(Number(e.target.value))
                        }
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="notification_detect">
        {(field) => (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="mb-1 text-sm font-medium">
                  Microphone detection
                </h3>
                <p className="text-xs text-neutral-600">
                  Automatically detect when a meeting starts based on microphone
                  activity.
                </p>
              </div>
              <Switch
                checked={field.state.value}
                onCheckedChange={field.handleChange}
              />
            </div>

            {field.state.value && (
              <div
                className={cn([
                  "ml-6 border-l-2 border-muted pl-6 pt-2 flex flex-col gap-4",
                ])}
              >
                <div className="flex flex-col gap-3">
                  <form.Field name="mic_detection_delay_secs">
                    {(subField) => (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-neutral-600">
                          Detection delay (seconds)
                        </span>
                        <Input
                          type="number"
                          min={0}
                          max={600}
                          className="w-20 h-7 text-xs"
                          value={subField.state.value}
                          onChange={(e) =>
                            subField.handleChange(Number(e.target.value))
                          }
                        />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="mic_notification_timeout_secs">
                    {(subField) => (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-neutral-600">
                          Auto-dismiss after (seconds)
                        </span>
                        <Input
                          type="number"
                          min={0}
                          max={300}
                          className="w-20 h-7 text-xs"
                          value={subField.state.value}
                          onChange={(e) =>
                            subField.handleChange(Number(e.target.value))
                          }
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
                <div className="mb-3 flex flex-col gap-1">
                  <h4 className="text-sm font-medium">
                    Exclude apps from detection
                  </h4>
                  <p className="text-xs text-neutral-600">
                    These apps will not trigger detection.
                  </p>
                </div>
                <div className="relative" ref={containerRef}>
                  <div
                    className="min-h-[38px] w-full flex flex-wrap items-center gap-2 rounded-md border p-2 cursor-text"
                    onClick={() => inputRef.current?.focus()}
                  >
                    {ignoredPlatforms.map((app: string) => {
                      const isDefault = isDefaultIgnored(app);
                      return (
                        <Badge
                          key={app}
                          variant="secondary"
                          className={cn([
                            "flex items-center gap-1 px-2 py-0.5 text-xs",
                            isDefault
                              ? ["bg-neutral-200 text-neutral-700"]
                              : ["bg-muted"],
                          ])}
                          title={isDefault ? "default" : undefined}
                        >
                          {app}
                          {isDefault && (
                            <span className="text-[10px] opacity-70">
                              (default)
                            </span>
                          )}
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
                    <input
                      ref={inputRef}
                      type="text"
                      className="flex-1 min-w-[120px] bg-transparent outline-hidden text-sm placeholder:text-muted-foreground"
                      placeholder={
                        ignoredPlatforms.length === 0
                          ? "Type to add apps..."
                          : ""
                      }
                      value={inputValue}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setShowDropdown(true)}
                    />
                  </div>
                  {showDropdown && dropdownOptions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md overflow-hidden">
                      <div className="max-h-[200px] overflow-auto py-1">
                        {dropdownOptions.map((app, index) => {
                          const isCustom = showCustomOption && index === 0;
                          return (
                            <button
                              key={app}
                              type="button"
                              className={cn([
                                "w-full px-3 py-1.5 text-left text-sm transition-colors",
                                "hover:bg-accent hover:text-accent-foreground",
                                selectedIndex === index &&
                                  "bg-accent text-accent-foreground",
                              ])}
                              onClick={() => handleAddIgnoredApp(app)}
                              onMouseEnter={() => setSelectedIndex(index)}
                            >
                              {isCustom ? (
                                <span>
                                  Add "
                                  <span className="font-medium">{app}</span>"
                                </span>
                              ) : (
                                app
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </form.Field>

      <div className="flex flex-col gap-6">
        <div className="relative flex items-center pt-4 pb-2">
          <div className="w-full border-t border-muted" />
          <span className="absolute left-1/2 -translate-x-1/2 bg-background px-4 text-xs font-medium text-muted-foreground">
            For enabled notifications
          </span>
        </div>

        <form.Field name="respect_dnd">
          {(field) => (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="mb-1 text-sm font-medium">
                  Respect Do-Not-Disturb mode
                </h3>
                <p className="text-xs text-neutral-600">
                  Don't show notifications when Do-Not-Disturb is enabled on
                  your system
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
  );
}
