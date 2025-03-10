import { z } from "zod";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LANGUAGES_ISO_639_1 } from "@huggingface/languages";
import { Trans } from "@lingui/react/macro";

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
import { Switch } from "@hypr/ui/components/ui/switch";
import { Input } from "@hypr/ui/components/ui/input";
import { type ConfigGeneral, commands as dbCommands } from "@hypr/plugin-db";

type ISO_639_1_CODE = keyof typeof LANGUAGES_ISO_639_1;
const SUPPORTED_LANGUAGES: ISO_639_1_CODE[] = ["en", "ko"];

const schema = z.object({
  autostart: z.boolean().optional(),
  displayLanguage: z.enum(SUPPORTED_LANGUAGES as [string, ...string[]]),
  jargons: z.string(),
  tags: z.array(z.string()),
});

type Schema = z.infer<typeof schema>;

export default function General() {
  const queryClient = useQueryClient();

  const config = useQuery({
    queryKey: ["config", "general"],
    queryFn: async () => {
      const result = await dbCommands.getConfig();
      return result;
    },
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      autostart: config.data?.general.autostart ?? false,
      displayLanguage: config.data?.general.display_language ?? "en",
      jargons: (config.data?.general.jargons ?? []).join(", "),
      tags: config.data?.general.tags ?? [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      if (!config.data) {
        console.error("cannot mutate config because it is not loaded");
        return;
      }

      const nextGeneral: ConfigGeneral = {
        autostart: v.autostart ?? true,
        display_language: v.displayLanguage,
        jargons: v.jargons.split(",").map((jargon) => jargon.trim()),
        tags: v.tags,
      };

      try {
        await dbCommands.setConfig({
          ...config.data,
          general: nextGeneral,
        });
      } catch (e) {
        console.error(e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "general"] });
    },
  });

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
            name="autostart"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div>
                  <FormLabel className="">Open Hyprnote on startup</FormLabel>
                  <FormDescription className="">
                    Hyprnote will be opened automatically when you start your
                    computer.
                  </FormDescription>
                </div>

                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    color="gray"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="displayLanguage"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div>
                  <FormLabel className="">Display language</FormLabel>
                  <FormDescription className="">
                    This is the language you read.
                  </FormDescription>
                </div>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="max-w-[100px] focus:outline-none focus:ring-0 focus:ring-offset-0  ">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent align="end" className=" ">
                    {SUPPORTED_LANGUAGES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {LANGUAGES_ISO_639_1[code].nativeName}
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
            name="jargons"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel className="">
                    <Trans>Jargons</Trans>
                  </FormLabel>
                  <FormDescription className="">
                    You can make Hyprnote takes these words into account when
                    transcribing.
                  </FormDescription>
                </div>
                <FormControl>
                  <Input
                    placeholder="Type jargons (e.g., Blitz Meeting, PaC Squad)"
                    {...field}
                    value={field.value ?? ""}
                    className="focus-visible:ring-0 focus-visible:ring-offset-0  "
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
