import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { type AutomationConfig, commands as meetingAutomationCommands } from "@hypr/plugin-meeting-automation";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@hypr/ui/components/ui/form";
import { Switch } from "@hypr/ui/components/ui/switch";

const schema = z.object({
  enabled: z.boolean().optional(),
  auto_start_on_mic_activity: z.boolean().optional(),
  require_window_focus: z.boolean().optional(),
});

type Schema = z.infer<typeof schema>;

export default function NotificationsComponent() {
  const automationConfig = useQuery({
    queryKey: ["meeting-automation", "config"],
    queryFn: () => meetingAutomationCommands.getAutomationConfig(),
  });

  const automationStatus = useQuery({
    queryKey: ["meeting-automation", "status"],
    queryFn: () => meetingAutomationCommands.getAutomationStatus(),
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      enabled: automationConfig.data?.enabled ?? false,
      auto_start_on_mic_activity: automationConfig.data?.auto_start_on_mic_activity ?? false,
      require_window_focus: automationConfig.data?.require_window_focus ?? false,
    },
  });

  const configMutation = useMutation({
    mutationFn: async (v: Schema) => {
      const currentConfig = automationConfig.data || {
        enabled: false,
        auto_start_on_app_detection: false,
        auto_start_on_mic_activity: false,
        auto_stop_on_app_exit: false,
        auto_start_scheduled_meetings: false,
        require_window_focus: false,
        pre_meeting_notification_minutes: 5,
        post_meeting_start_window_minutes: 5,
        supported_apps: [],
        notification_settings: {
          show_meeting_started: true,
          show_meeting_ending: true,
          show_pre_meeting_reminder: true,
          show_recording_started: true,
          show_recording_stopped: true,
        },
      };

      const newConfig: AutomationConfig = {
        ...currentConfig,
        ...v,
        // Smart defaults: when enabled, automatically enable core features
        auto_start_on_app_detection: v.enabled ?? currentConfig.auto_start_on_app_detection,
        auto_stop_on_app_exit: v.enabled ?? currentConfig.auto_stop_on_app_exit,
        auto_start_scheduled_meetings: v.enabled ?? currentConfig.auto_start_scheduled_meetings,
      };

      await meetingAutomationCommands.configureAutomation(newConfig);

      if (newConfig.enabled) {
        await meetingAutomationCommands.startMeetingAutomation();
      } else {
        await meetingAutomationCommands.stopMeetingAutomation();
      }

      return newConfig;
    },
    onSuccess: () => {
      automationConfig.refetch();
      automationStatus.refetch();
    },
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      configMutation.mutate(value);
    });

    return () => subscription.unsubscribe();
  }, [configMutation]);

  return (
    <div>
      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="space-y-6">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <FormLabel>
                      <Trans>Auto-record meetings</Trans>
                    </FormLabel>
                    <FormDescription>
                      <Trans>
                        Automatically start and stop recording when meetings are detected.
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

          {form.watch("enabled") && (
            <div className="ml-6 space-y-6 border-l-2 border-gray-100 pl-6">
              <div className="text-sm font-medium text-gray-700">
                <Trans>Advanced settings</Trans>
              </div>

              <FormField
                control={form.control}
                name="auto_start_on_mic_activity"
                render={({ field }) => (
                  <FormItem className="space-y-6">
                    <div className="flex flex-row items-center justify-between">
                      <div>
                        <FormLabel>
                          <Trans>Also detect microphone activity</Trans>
                        </FormLabel>
                        <FormDescription>
                          <Trans>
                            Start recording even when just microphone activity is detected.
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
                name="require_window_focus"
                render={({ field }) => (
                  <FormItem className="space-y-6">
                    <div className="flex flex-row items-center justify-between">
                      <div>
                        <FormLabel>
                          <Trans>Require window focus</Trans>
                        </FormLabel>
                        <FormDescription>
                          <Trans>
                            Only start recording when the meeting window is in focus.
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
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
