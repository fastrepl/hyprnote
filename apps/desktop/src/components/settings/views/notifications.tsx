import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { commands as notificationCommands } from "@hypr/plugin-notification";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@hypr/ui/components/ui/form";
import { Switch } from "@hypr/ui/components/ui/switch";

const schema = z.object({
  detect: z.boolean().optional(),
  event: z.boolean().optional(),
});

type Schema = z.infer<typeof schema>;

export default function NotificationsComponent() {
  const eventNotification = useQuery({
    queryKey: ["notification", "event"],
    queryFn: () => notificationCommands.getEventNotification(),
  });

  const detectNotification = useQuery({
    queryKey: ["notification", "detect"],
    queryFn: () => notificationCommands.getDetectNotification(),
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      detect: detectNotification.data ?? false,
      event: eventNotification.data ?? false,
    },
  });

  const eventMutation = useMutation({
    mutationFn: async (v: Schema) => {
      if (v.event) {
        notificationCommands.requestNotificationPermission().then(() => {
          notificationCommands.setDetectNotification(true);
        });
      } else {
        notificationCommands.setDetectNotification(false);
      }
      return v.detect;
    },
    onSuccess: (active) => {
      detectNotification.refetch();
      if (active) {
        notificationCommands.startDetectNotification();
      } else {
        notificationCommands.stopDetectNotification();
      }
    },
  });

  const detectMutation = useMutation({
    mutationFn: async (v: Schema) => {
      if (v.detect) {
        notificationCommands.requestNotificationPermission().then(() => {
          notificationCommands.setEventNotification(true);
        });
      } else {
        notificationCommands.setEventNotification(false);
      }
      return v.event;
    },
    onSuccess: (active) => {
      eventNotification.refetch();
      if (active) {
        notificationCommands.startEventNotification();
      } else {
        notificationCommands.stopEventNotification();
      }
    },
  });

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "detect") {
        detectMutation.mutate(value);
      }
      if (name === "event") {
        eventMutation.mutate(value);
      }
    });

    return () => subscription.unsubscribe();
  }, [eventMutation, detectMutation]);

  return (
    <div>
      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="detect"
            render={({ field }) => (
              <FormItem className="space-y-6">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <FormLabel>
                      <Trans>(Beta) Detect meetings automatically</Trans>
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
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="event"
            render={({ field }) => (
              <FormItem className="space-y-6">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <FormLabel>
                      <Trans>(Beta) Upcoming meeting notifications</Trans>
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
        </form>
      </Form>
    </div>
  );
}
