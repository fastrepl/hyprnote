import { z } from "zod";
import { forwardRef, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LANGUAGES_ISO_639_1 } from "@huggingface/languages";

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
import { Badge } from "@hypr/ui/components/ui/badge";

import { commands, type ConfigGeneral } from "@/types";
import { Trans } from "@lingui/react/macro";
import { cn } from "@/utils";

type ISO_639_1_CODE = keyof typeof LANGUAGES_ISO_639_1;
const SUPPORTED_LANGUAGES: ISO_639_1_CODE[] = ["en", "ko"];

const schema = z.object({
  autostart: z.boolean().optional(),
  displayLanguage: z.enum(SUPPORTED_LANGUAGES as [string, ...string[]]),
  speechLanguage: z.enum(SUPPORTED_LANGUAGES as [string, ...string[]]),
  jargons: z.string(),
  tags: z.array(z.string()),
});

type Schema = z.infer<typeof schema>;

const TagInput = forwardRef<
  HTMLDivElement,
  {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
  }
>(({ value, onChange, placeholder, className }, ref) => {
  const [inputValue, setInputValue] = useState("");
  const tags = value
    ? value
        .split(",")
        .filter(Boolean)
        .map((t) => t.trim())
    : [];

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag].join(", "));
    }
    setInputValue("");
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove).join(", "));
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex w-full flex-wrap gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
        className,
      )}
    >
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="flex h-fit items-center gap-1"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="outline-none hover:text-destructive"
          >
            ×
          </button>
        </Badge>
      ))}
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(inputValue);
          } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
          }
        }}
        onBlur={() => {
          if (inputValue) {
            addTag(inputValue);
          }
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 bg-transparent outline-none placeholder:text-neutral-400"
      />
    </div>
  );
});
TagInput.displayName = "TagInput";

export default function General() {
  const queryClient = useQueryClient();

  const config = useQuery({
    queryKey: ["config", "general"],
    queryFn: async () => {
      const result = await commands.getConfig();
      console.log(result);
      return result;
    },
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      autostart: config.data?.general.autostart ?? false,
      displayLanguage: (config.data?.general.display_language ??
        "en") as ISO_639_1_CODE,
      speechLanguage: (config.data?.general.speech_language ??
        "en") as ISO_639_1_CODE,
      jargons: (config.data?.general.jargons ?? []).join(", "),
      tags: config.data?.general.tags ?? [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      console.log(config.data);
      if (!config.data) {
        console.error("cannot mutate config because it is not loaded");
        return;
      }

      const nextGeneral: ConfigGeneral = {
        autostart: v.autostart ?? true,
        speech_language: (v.speechLanguage ?? "en") as ISO_639_1_CODE,
        display_language: (v.displayLanguage ?? "en") as ISO_639_1_CODE,
        jargons: v.jargons.split(",").map((jargon) => jargon.trim()),
        tags: [],
      };

      console.log(nextGeneral);

      await commands.setConfig({
        user_id: config.data.user_id,
        general: nextGeneral,
        notification: config.data.notification,
      });
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
        <form className="space-y-6">
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
                  <FormLabel>Display language</FormLabel>
                  <FormDescription>
                    This is the language you read.
                  </FormDescription>
                </div>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="max-w-[100px]">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
            name="speechLanguage"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div>
                  <FormLabel>Speech language</FormLabel>
                  <FormDescription>
                    This is the language you speak or listen to.
                  </FormDescription>
                </div>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="max-w-[100px]">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
                  <FormLabel>
                    <Trans>Jargons</Trans>
                  </FormLabel>
                  <FormDescription>
                    You can make Hyprnote takes these words into account when
                    transcribing.
                  </FormDescription>
                </div>
                <FormControl>
                  <TagInput
                    placeholder="Type and press Comma(,) or Enter to add jargons (e.g., Blitz Meeting, PaC Squad)"
                    {...field}
                    value={field.value ?? ""}
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
