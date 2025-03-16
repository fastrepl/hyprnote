import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { commands as dbCommands, type ConfigNotification } from "@hypr/plugin-db";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@hypr/ui/components/ui/form";
import { Switch } from "@hypr/ui/components/ui/switch";
import { Trans } from "@lingui/react/macro";

const schema = z.object({
  before: z.boolean().optional(),
  auto: z.boolean().optional(),
});

type Schema = z.infer<typeof schema>;

export default function NotificationsComponent() {
  const queryClient = useQueryClient();

  const config = useQuery({
    queryKey: ["config", "notifications"],
    queryFn: async () => {
      const result = await dbCommands.getConfig();
      return result;
    },
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      before: config.data?.notification.before ?? true,
      auto: config.data?.notification.auto ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      const newNotification: ConfigNotification = {
        before: v.before ?? true,
        auto: v.auto ?? true,
      };

      if (!config.data) {
        console.error("cannot mutate config because it is not loaded");
        return;
      }

      try {
        await dbCommands.setConfig({
          ...config.data,
          notification: newNotification,
        });
      } catch (e) {
        console.error(e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "notifications"] });
    },
  });

  useEffect(() => {
    const subscription = form.watch(() => form.handleSubmit((v) => mutation.mutate(v))());
    return () => subscription.unsubscribe();
  }, [mutation]);

  return (
    <div>
      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="before"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div>
                  <FormLabel>
                    <Trans>Meeting notifications</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>Show notifications 1 minute before meetings start based on your Calendar</Trans>
                  </FormDescription>
                </div>

                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="auto"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div>
                  <FormLabel>
                    <Trans>Automatic meeting detection</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>Show notifications whenever a call is detected</Trans>
                  </FormDescription>
                </div>

                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
