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

import { commands, type ConfigDataGeneral } from "@/types/tauri";

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
  language: z.enum(["En", "Ko"]),
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
    defaultValues: {
      language: config.data?.language
        ? (config.data?.language as "En" | "Ko")
        : "En",
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      const config: ConfigDataGeneral = {
        language: v.language,
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
    <div className="px-8">
      <Form {...form}>
        <form className="gap-2">
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Language</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select language" />
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
                <FormDescription>
                  Select your preferred interface language
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
