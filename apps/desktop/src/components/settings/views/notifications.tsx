import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useHypr } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as notificationCommands } from "@hypr/plugin-notification";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@hypr/ui/components/ui/command";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@hypr/ui/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Switch } from "@hypr/ui/components/ui/switch";

const schema = z.object({
  detect: z.boolean().optional(),
  event: z.boolean().optional(),
  respectDoNotDisturb: z.boolean().optional(),
  ignoredPlatforms: z.array(z.string()).optional(),
});

type Schema = z.infer<typeof schema>;

export default function NotificationsComponent() {
  const { userId } = useHypr();
  const [newAppName, setNewAppName] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const eventNotification = useQuery({
    queryKey: ["notification", "event"],
    queryFn: () => notificationCommands.getEventNotification(),
  });

  const detectNotification = useQuery({
    queryKey: ["notification", "detect"],
    queryFn: () => notificationCommands.getDetectNotification(),
  });

  const ignoredPlatforms = useQuery({
    queryKey: ["notification", "ignoredPlatforms"],
    queryFn: () => notificationCommands.getIgnoredPlatforms(),
  });

  const respectDoNotDisturb = useQuery({
    queryKey: ["notification", "respectDoNotDisturb"],
    queryFn: () => notificationCommands.getRespectDoNotDisturb(),
  });

  const applications = useQuery({
    queryKey: ["notification", "applications"],
    queryFn: () => notificationCommands.listApplications(),
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      detect: detectNotification.data ?? false,
      event: eventNotification.data ?? false,
      respectDoNotDisturb: respectDoNotDisturb.data ?? false,
      ignoredPlatforms: ignoredPlatforms.data ?? [],
    },
  });

  const eventMutation = useMutation({
    mutationFn: async (v: Schema) => {
      if (v.event) {
        notificationCommands.setEventNotification(true);
      } else {
        notificationCommands.setEventNotification(false);
      }
      return v.event;
    },
    onSuccess: async (active) => {
      eventNotification.refetch();

      // Track notification setting change in analytics
      if (userId) {
        await analyticsCommands.setProperties({
          distinct_id: userId,
          set: {
            event_notification: active,
          },
        });
      }

      if (active) {
        notificationCommands.startEventNotification();
        notificationCommands.showNotification({
          key: null,
          title: "You're all set!",
          message: "This is how notifications look.",
          timeout: { secs: 10, nanos: 0 },
          url: null,
        });
      } else {
        notificationCommands.stopEventNotification();
      }
    },
  });

  const detectMutation = useMutation({
    mutationFn: async (v: Schema) => {
      if (v.detect) {
        notificationCommands.setDetectNotification(true);
      } else {
        notificationCommands.setDetectNotification(false);
      }
      return v.detect;
    },
    onSuccess: async (active) => {
      detectNotification.refetch();

      // Track notification setting change in analytics
      if (userId) {
        await analyticsCommands.setProperties({
          distinct_id: userId,
          set: {
            audio_notification: active,
          },
        });
      }

      if (active) {
        notificationCommands.startDetectNotification();
        notificationCommands.showNotification({
          key: null,
          title: "You're all set!",
          message: "This is how notifications look.",
          timeout: { secs: 10, nanos: 0 },
          url: null,
        });
      } else {
        notificationCommands.stopDetectNotification();
      }
    },
  });

  const respectDoNotDisturbMutation = useMutation({
    mutationFn: async (v: Schema) => {
      if (v.respectDoNotDisturb) {
        notificationCommands.setRespectDoNotDisturb(true);
      } else {
        notificationCommands.setRespectDoNotDisturb(false);
      }
      return v.respectDoNotDisturb;
    },
    onSuccess: () => {
      respectDoNotDisturb.refetch();
    },
  });

  const ignoredPlatformsMutation = useMutation({
    mutationFn: async (platforms: string[]) => {
      await notificationCommands.setIgnoredPlatforms(platforms);
      return platforms;
    },
    onSuccess: () => {
      ignoredPlatforms.refetch();
    },
  });

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "detect" && value.detect !== undefined) {
        detectMutation.mutate({ detect: value.detect });
      }
      if (name === "event" && value.event !== undefined) {
        eventMutation.mutate({ event: value.event });
      }
      if (name === "respectDoNotDisturb" && value.respectDoNotDisturb !== undefined) {
        respectDoNotDisturbMutation.mutate({ respectDoNotDisturb: value.respectDoNotDisturb });
      }
      if (name === "ignoredPlatforms" && value.ignoredPlatforms) {
        const filteredPlatforms = value.ignoredPlatforms.filter((p): p is string => !!p);
        ignoredPlatformsMutation.mutate(filteredPlatforms);
      }
    });

    return () => subscription.unsubscribe();
  }, [eventMutation, detectMutation, respectDoNotDisturbMutation, ignoredPlatformsMutation]);

  const handleAddIgnoredApp = (appName: string) => {
    const trimmedName = appName.trim();
    if (trimmedName) {
      const currentIgnored = form.getValues("ignoredPlatforms") ?? [];
      if (!currentIgnored.includes(trimmedName)) {
        const updated = [...currentIgnored, trimmedName];
        form.setValue("ignoredPlatforms", updated);
        ignoredPlatformsMutation.mutate(updated);
      }
      setNewAppName("");
      setPopoverOpen(false);
    }
  };

  const handleRemoveIgnoredApp = (app: string) => {
    const currentIgnored = form.getValues("ignoredPlatforms") ?? [];
    const updated = currentIgnored.filter(a => a !== app);
    form.setValue("ignoredPlatforms", updated);
    ignoredPlatformsMutation.mutate(updated);
  };

  return (
    <div>
      <Form {...form}>
        <form className="space-y-8">
          <FormField
            control={form.control}
            name="event"
            render={({ field }) => (
              <FormItem className="space-y-6">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <FormLabel className="flex items-center gap-2">
                      <Trans>Upcoming meeting notifications</Trans>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Preview
                      </span>
                    </FormLabel>
                    <FormDescription>
                      <Trans>
                        Show notifications when you have meetings starting soon in your calendar.
                      </Trans>
                    </FormDescription>
                  </div>

                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="detect"
            render={({ field }) => (
              <FormItem className="space-y-6">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <FormLabel className="flex items-center gap-2">
                      <Trans>Detect meetings automatically</Trans>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Preview
                      </span>
                    </FormLabel>
                    <FormDescription>
                      <Trans>
                        Show notifications when you join a meeting.
                      </Trans>
                    </FormDescription>
                  </div>

                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </div>

                <FormItem className={`ml-6 mt-4 border-l-2 border-muted pl-6 pt-2 ${!field.value ? "opacity-50" : ""}`}>
                  <div className="space-y-1 mb-3">
                    <FormLabel className="text-sm">
                      <Trans>Exclude apps from detection</Trans>
                    </FormLabel>
                    <FormDescription className="text-xs">
                      <Trans>These apps will not trigger meeting detection</Trans>
                    </FormDescription>
                  </div>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex-1 flex flex-wrap gap-2 min-h-[38px] p-2 border rounded-md ${
                          !field.value ? "bg-muted/50" : ""
                        }`}
                      >
                        {(form.watch("ignoredPlatforms") || []).map((app) => (
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
                              onClick={() => field.value && handleRemoveIgnoredApp(app)}
                              disabled={!field.value}
                            >
                              <X className="h-2.5 w-2.5" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                      <Popover
                        open={popoverOpen && field.value}
                        onOpenChange={(open) => field.value && setPopoverOpen(open)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-[38px] w-[38px]"
                            disabled={!field.value}
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
                              {applications.data?.map(app => app.localized_name)
                                .filter(app => !(form.watch("ignoredPlatforms") || []).includes(app))
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
                  </FormControl>
                </FormItem>
              </FormItem>
            )}
          />
          {(form.watch("event") || form.watch("detect")) && (
            <>
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-4 text-muted-foreground font-medium">
                    <Trans>Global Settings</Trans>
                  </span>
                </div>
              </div>
              <FormField
                control={form.control}
                name="respectDoNotDisturb"
                render={({ field }) => (
                  <FormItem className="space-y-6">
                    <div className="flex flex-row items-center justify-between">
                      <div>
                        <FormLabel>
                          <Trans>Respect Do Not Disturb</Trans>
                        </FormLabel>
                        <FormDescription>
                          <Trans>
                            Don't show notifications when Do Not Disturb is enabled on your system.
                          </Trans>
                        </FormDescription>
                      </div>

                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </>
          )}
        </form>
      </Form>
    </div>
  );
}
