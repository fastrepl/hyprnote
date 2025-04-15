import { zodResolver } from "@hookform/resolvers/zod";
import { LANGUAGES_ISO_639_1 } from "@huggingface/languages";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { commands } from "@/types";
import { commands as dbCommands, type ConfigGeneral } from "@hypr/plugin-db";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@hypr/ui/components/ui/form";
import { Input } from "@hypr/ui/components/ui/input";
import { Switch } from "@hypr/ui/components/ui/switch";

type ISO_639_1_CODE = keyof typeof LANGUAGES_ISO_639_1;
const SUPPORTED_LANGUAGES: ISO_639_1_CODE[] = ["en"];

const schema = z.object({
  autostart: z.boolean().optional(),
  displayLanguage: z.enum(SUPPORTED_LANGUAGES as [string, ...string[]]),
  telemetryConsent: z.boolean().optional(),
  jargons: z.string(),
});

type Schema = z.infer<typeof schema>;

export default function General() {
  const { t } = useLingui();
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
      telemetryConsent: config.data?.general.telemetry_consent ?? true,
      jargons: (config.data?.general.jargons ?? []).join(", "),
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
        telemetry_consent: v.telemetryConsent ?? true,
        jargons: v.jargons.split(",").map((jargon) => jargon.trim()).filter(Boolean),
      };

      await dbCommands.setConfig({
        ...config.data,
        general: nextGeneral,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "general"] });
    },
    onError: console.error,
  });

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "jargons") {
        return;
      }

      mutation.mutate(form.getValues());

      if (name === "autostart") {
        commands.setAutostart(!!value.autostart);
      }
    });

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
                  <FormLabel>
                    <Trans>Open Hyprnote on startup</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>
                      Hyprnote will be opened automatically when you start your computer
                    </Trans>
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
            name="telemetryConsent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div>
                  <FormLabel>
                    <Trans>Share usage data</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>
                      Help us improve Hyprnote by sharing anonymous usage data
                    </Trans>
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
            name="jargons"
            render={({ field }) => (
              <FormItem>
                <div>
                  <FormLabel>
                    <Trans>Jargons</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>
                      You can make Hyprnote takes these words into account when transcribing
                    </Trans>
                  </FormDescription>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={() => mutation.mutate(form.getValues())}
                    placeholder={t({
                      id: "Type jargons (e.g., Blitz Meeting, PaC Squad)",
                    })}
                    value={field.value ?? ""}
                    className="focus-visible:ring-0 focus-visible:ring-offset-0"
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
