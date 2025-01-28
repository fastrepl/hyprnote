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
  FormMessage,
} from "@hypr/ui/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";
import { Checkbox } from "@hypr/ui/components/ui/checkbox";
import { Textarea } from "@hypr/ui/components/ui/textarea";

import { commands, type ConfigDataGeneral } from "@/types/tauri.gen";

const LANGUAGES = [
  {
    display: "English",
    value: "En",
  },
  {
    display: "한국어",
    value: "Ko",
  },
] as const;

const schema = z.object({
  autostart: z.boolean().optional(),
  notifications: z.boolean().optional(),
  language: z.enum(["En", "Ko"]).optional(),
  context: z.string().max(2000).optional(),
});

type Schema = z.infer<typeof schema>;

export default function General() {
  const queryClient = useQueryClient();

  const config = useQuery({
    queryKey: ["config", "general"],
    queryFn: async () => {
      const result = await commands.dbGetConfig("general");
      if (result === null) {
        return null;
      }
      return result.data as ConfigDataGeneral;
    },
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      autostart: config.data?.autostart ?? false,
      notifications: config.data?.notifications ?? false,
      language: (config.data?.language ?? "En") as "En" | "Ko",
      context: config.data?.context ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      const config: ConfigDataGeneral = {
        autostart: v.autostart ?? true,
        notifications: v.notifications ?? true,
        language: v.language ?? "En",
        context: v.context ?? "",
      };

      await commands.dbSetConfig({ type: "general", data: config });
    },
  });

  useEffect(() => {
    if (mutation.status === "success") {
      queryClient.invalidateQueries({ queryKey: ["config", "general"] });
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
        <form className="mb-4 flex flex-col gap-8">
          <FormField
            control={form.control}
            name="autostart"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div>
                  <FormLabel>Open Hyprnote on startup</FormLabel>
                  <FormDescription>
                    Hyprnote will be opened automatically when you start your
                    computer.
                  </FormDescription>
                </div>

                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notifications"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div>
                  <FormLabel>Meeting notifications</FormLabel>
                  <FormDescription>
                    Hyprnote will notify you when a meeting is starting.
                  </FormDescription>
                </div>

                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div>
                  <FormLabel>Language</FormLabel>
                  <FormDescription>
                    You can manage email addresses in your{" "}
                  </FormDescription>
                </div>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="max-w-[100px]">
                      <SelectValue placeholder="Select a verified email to display" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LANGUAGES.map((language) => (
                      <SelectItem key={language.value} value={language.value}>
                        {language.display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="context"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>Context</FormLabel>
                  <FormDescription>
                    You can add context to your notes to help you get started
                    with your meetings. your meetings.
                  </FormDescription>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Tell us a little bit about yourself"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
