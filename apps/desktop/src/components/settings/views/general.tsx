import { zodResolver } from "@hookform/resolvers/zod";
import { LANGUAGES_ISO_639_1 } from "@huggingface/languages";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { showModelSelectToast } from "@/components/toast/model-select";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Switch } from "@hypr/ui/components/ui/switch";

type ISO_639_1_CODE = keyof typeof LANGUAGES_ISO_639_1;
const SUPPORTED_LANGUAGES: ISO_639_1_CODE[] = [
  "es",
  "it",
  "ko",
  "pt",
  "en",
  "pl",
  "ca",
  "ja",
  "de",
  "ru",
  "nl",
  "fr",
  "id",
  "uk",
  "tr",
  "ms",
  "sv",
  "zh",
  "fi",
  "no",
  "ro",
  "th",
  "vi",
  "sk",
  "ar",
  "cs",
  "hr",
  "el",
  "sr",
  "da",
  "bg",
  "hu",
  "tl",
  "bs",
  "gl",
  "mk",
  "hi",
  "et",
  "sl",
  "ta",
  "lv",
  "az",
];

const schema = z.object({
  autostart: z.boolean().optional(),
  displayLanguage: z.enum(SUPPORTED_LANGUAGES as [string, ...string[]]),
  telemetryConsent: z.boolean().optional(),
  jargons: z.string(),
  saveRecordings: z.boolean().optional(),
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
    defaultValues: {
      autostart: false,
      displayLanguage: "en",
      telemetryConsent: true,
      jargons: "",
      saveRecordings: true,
    },
  });

  useEffect(() => {
    if (config.data) {
      form.reset({
        autostart: config.data.general.autostart ?? false,
        displayLanguage: config.data.general.display_language ?? "en",
        telemetryConsent: config.data.general.telemetry_consent ?? true,
        jargons: (config.data.general.jargons ?? []).join(", "),
        saveRecordings: config.data.general.save_recordings ?? true,
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
        jargons: v.jargons.split(",").map((jargon) => jargon.trim()).filter(Boolean),
        save_recordings: v.saveRecordings ?? true,
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

      if (name === "displayLanguage" && value.displayLanguage) {
        showModelSelectToast(value.displayLanguage);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, mutation]);

  return (
    <div>
      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="saveRecordings"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div>
                  <FormLabel>
                    <Trans>Save recordings</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>
                      Choose whether to save your recordings locally.
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
            name="displayLanguage"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel>
                    <Trans>Language</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>Choose your preferred language of use</Trans>
                  </FormDescription>
                </div>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {LANGUAGES_ISO_639_1[lang].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                {/* FormMessage is usually displayed below the control, might need separate handling if it must be in-row and an error occurs */}
                {/* <FormMessage /> */}
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
