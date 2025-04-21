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
  before: z.boolean().optional(),
  auto: z.boolean().optional(),
  ignoredPlatforms: z.array(z.string()).optional(),
});

type Schema = z.infer<typeof schema>;

export default function NotificationsComponent() {
  const auto = useQuery({
    queryKey: ["notification", "auto"],
    queryFn: () => notificationCommands.getDetectNotification(),
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      auto: auto.data ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      if (v.auto) {
        notificationCommands.setDetectNotification(true);
      } else {
        notificationCommands.setDetectNotification(false);
      }
      return v.auto;
    },
    onSuccess: (active) => {
      auto.refetch();
      if (active) {
        notificationCommands.startDetectNotification();
      } else {
        notificationCommands.stopDetectNotification();
      }
    },
  });

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      mutation.mutate(form.getValues());
    });

    return () => subscription.unsubscribe();
  }, [mutation]);

  return (
    <div>
      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="auto"
            render={({ field }) => (
              <FormItem className="space-y-6">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <FormLabel>
                      <Trans>Detect meetings automatically</Trans>
                    </FormLabel>
                    <FormDescription>
                      <Trans>
                        Show notifications when you join a meeting. This is not perfect.
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
