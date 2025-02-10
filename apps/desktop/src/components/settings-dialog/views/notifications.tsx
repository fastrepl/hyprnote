import { z } from "zod";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@hypr/ui/components/ui/form";
import { Switch } from "@hypr/ui/components/ui/switch";

import { commands, type ConfigNotification } from "@/types";

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
      const result = await commands.getConfig();
      return result;
    },
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      before: config.data?.notification.before ?? true,
      detection: config.data?.notification.auto ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      const newNotification: ConfigNotification = {
        before: v.before ?? true,
        auto: v.detection ?? true,
      };

      await commands.setConfig({
        // TODO
        general: config.data?.general!,
        notification: newNotification,
      });
    },
  });
  useEffect(() => {
    if (mutation.status === "success") {
      queryClient.invalidateQueries({ queryKey: ["config", "notifications"] });
    }
  }, [mutation.status]);

  useEffect(() => {
    const subscription = form.watch(() =>
      form.handleSubmit((v) => mutation.mutate(v))(),
    );
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
                  <FormLabel>Meeting notifications</FormLabel>
                  <FormDescription>
                    Show notifications 1 minute before meetings start based on
                    your Calendar
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
                  <FormLabel>Automatic meeting detection</FormLabel>
                  <FormDescription>
                    Show notifications whenever a call is detected
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
