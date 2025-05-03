import { zodResolver } from "@hookform/resolvers/zod";
import { LANGUAGES_ISO_639_1 } from "@huggingface/languages";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Switch } from "@hypr/ui/components/ui/switch";

type ISO_639_1_CODE = keyof typeof LANGUAGES_ISO_639_1;
const SUPPORTED_LANGUAGES: ISO_639_1_CODE[] = ["en", "de", "ru", "zh", "fr", "es", "ko", "ja"];

const schema = z.object({
  autostart: z.boolean().optional(),
  displayLanguage: z.enum(SUPPORTED_LANGUAGES as [string, ...string[]]),
  telemetryConsent: z.boolean().optional(),
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
    defaultValues: {
      autostart: false,
      displayLanguage: "en",
      telemetryConsent: true,
    },
  });

  useEffect(() => {
    if (config.data) {
      form.reset({
        autostart: config.data.general.autostart ?? false,
        displayLanguage: config.data.general.display_language ?? "en",
        telemetryConsent: config.data.general.telemetry_consent ?? true,
      });
    }
  }, [config.data, form]);

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      if (!config.data) {
        console.error("cannot mutate config because it is not loaded");
        return;
      }

      const nextGeneral: ConfigGeneral = {
        autostart: v.autostart ?? false,
        display_language: v.displayLanguage,
        telemetry_consent: v.telemetryConsent ?? true,
        jargons: config.data.general.jargons ?? [],
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
      mutation.mutate(form.getValues());
    });
    return () => subscription.unsubscribe();
  }, [form, mutation]);

  return (
    <div>
      <Form {...form}>
        <form className="space-y-6">
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
            name="displayLanguage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Trans>Language</Trans>
                </FormLabel>
                <FormDescription>
                  <Trans>Choose the language you want to use for the speech-to-text model and language model</Trans>
                </FormDescription>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {LANGUAGES_ISO_639_1[lang].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
