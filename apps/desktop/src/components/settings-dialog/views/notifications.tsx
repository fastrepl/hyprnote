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

import { commands, type ConfigDataGeneral } from "@/types/tauri.gen";

const schema = z.object({
  before: z.boolean().optional(),
  detection: z.boolean().optional(),
});

type Schema = z.infer<typeof schema>;

export default function NotificationsComponent() {
  const queryClient = useQueryClient();

  const config = useQuery({
    queryKey: ["config", "notifications"],
    queryFn: async () => {
      const result = await commands.getConfig("notifications");
      if (result === null) {
        return null;
      }
      return result.data as ConfigDataGeneral;
    },
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      before: config.data?.before ?? false,
      detection: config.data?.detection ?? false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      const config: ConfigDataGeneral = {
        before: true,
        detection: true,
      };

      await commands.setConfig({ type: "notifications", data: config });
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
            name="detection"
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
