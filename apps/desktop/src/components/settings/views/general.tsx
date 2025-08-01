import { zodResolver } from "@hookform/resolvers/zod";
import { LANGUAGES_ISO_639_1 } from "@huggingface/languages";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { showModelSelectToast } from "@/components/toast/model-select";
import { commands } from "@/types";
import { commands as dbCommands, type ConfigGeneral } from "@hypr/plugin-db";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@hypr/ui/components/ui/command";
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
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Select, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
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
  spokenLanguages: z.array(z.enum(SUPPORTED_LANGUAGES as [string, ...string[]])).min(1),
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
      spokenLanguages: ["en"],
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
        spokenLanguages: config.data.general.spoken_languages ?? ["en"],
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
        spoken_languages: v.spokenLanguages,
        telemetry_consent: v.telemetryConsent ?? true,
        jargons: v.jargons.split(",").map((jargon) => jargon.trim()).filter(Boolean),
        save_recordings: v.saveRecordings ?? true,
        selected_template_id: config.data.general.selected_template_id,
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
        <form className="space-y-8">
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
                  <FormDescription className="flex flex-col">
                    <span>
                      Help us improve Hyprnote by sharing anonymous usage data.
                    </span>
                    <span>
                      Restart Hyprnote for the change to take effect.
                    </span>
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
                    <Trans>Display language</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>Primary language for the interface</Trans>
                  </FormDescription>
                </div>
                <FormControl>
                  <Select
                    disabled
                    value="en"
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue>
                        {LANGUAGES_ISO_639_1["en"].name}
                      </SelectValue>
                    </SelectTrigger>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="spokenLanguages"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-0.5">
                  <FormLabel>
                    <Trans>Spoken languages</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>Select languages you speak for better transcription</Trans>
                  </FormDescription>
                </div>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex flex-wrap gap-2 min-h-[38px] p-2 border rounded-md">
                      {field.value.map((langCode) => (
                        <Badge
                          key={langCode}
                          variant="secondary"
                          className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted"
                        >
                          {LANGUAGES_ISO_639_1[langCode as ISO_639_1_CODE]?.name || langCode}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-3 w-3 p-0 hover:bg-transparent ml-0.5"
                            onClick={() => {
                              const newLanguages = field.value.filter((lang) => lang !== langCode);
                              field.onChange(newLanguages);
                              mutation.mutate(form.getValues());
                            }}
                          >
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-[38px] w-[38px]"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Search languages..." className="h-9" />
                          <CommandEmpty>No language found.</CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-auto">
                            {SUPPORTED_LANGUAGES.filter(
                              (lang) => !field.value.includes(lang),
                            ).map((lang) => (
                              <CommandItem
                                key={lang}
                                onSelect={() => {
                                  if (!field.value.includes(lang)) {
                                    field.onChange([...field.value, lang]);
                                    mutation.mutate(form.getValues());
                                  }
                                }}
                              >
                                {LANGUAGES_ISO_639_1[lang].name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="jargons"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-0.5">
                  <FormLabel>
                    <Trans>Custom Vocabulary</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>
                      Add specific terms or jargon for improved transcription accuracy
                    </Trans>
                  </FormDescription>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={() => mutation.mutate(form.getValues())}
                    placeholder={t({
                      id: "Type terms separated by commas (e.g., Blitz Meeting, PaC Squad)",
                    })}
                    className="focus-visible:ring-1 focus-visible:ring-ring"
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
