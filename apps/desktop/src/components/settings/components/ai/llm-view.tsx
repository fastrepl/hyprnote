import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@hypr/ui/lib/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { commands as connectorCommands, type Connection } from "@hypr/plugin-connector";
import { type SupportedModel as SupportedModelLLM } from "@hypr/plugin-local-llm";
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
import { Label } from "@hypr/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@hypr/ui/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";

const endpointSchema = z.object({
  model: z.string().min(1),
  api_base: z.string().url({ message: "Please enter a valid URL" }).min(1, { message: "URL is required" }).refine(
    (value) => {
      const v1Needed = ["openai", "openrouter"].some((host) => value.includes(host));
      if (v1Needed && !value.endsWith("/v1")) {
        return false;
      }

      return true;
    },
    { message: "Should end with '/v1'" },
  ).refine(
    (value) => !value.includes("chat/completions"),
    { message: "`/chat/completions` will be appended automatically" },
  ),
  api_key: z.string().optional(),
});

export type FormValues = z.infer<typeof endpointSchema>;

export function LLMView() {
  const { t } = useLingui();
  const customLLMConnection = useQuery({
    queryKey: ["custom-llm-connection"],
    queryFn: () => connectorCommands.getCustomLlmConnection(),
  });

  const availableLLMModels = useQuery({
    queryKey: ["available-llm-models"],
    queryFn: () => connectorCommands.listCustomLlmModels(),
    enabled: !!customLLMConnection.data?.api_base,
  });

  const getCustomLLMModel = useQuery({
    queryKey: ["custom-llm-model"],
    queryFn: () => connectorCommands.getCustomLlmModel(),
  });

  const setCustomLLMModel = useMutation({
    mutationFn: (model: string) => connectorCommands.setCustomLlmModel(model),
  });

  const setCustomLLMConnection = useMutation({
    mutationFn: (connection: Connection) => connectorCommands.setCustomLlmConnection(connection),
    onError: console.error,
    onSuccess: () => {
      customLLMConnection.refetch();
    },
  });

  const customLLMEnabled = useQuery({
    queryKey: ["custom-llm-enabled"],
    queryFn: () => connectorCommands.getCustomLlmEnabled(),
  });

  const setCustomLLMEnabled = useMutation({
    mutationFn: (enabled: boolean) => connectorCommands.setCustomLlmEnabled(enabled),
    onSuccess: () => {
      customLLMEnabled.refetch();
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(endpointSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (customLLMConnection.data) {
      form.reset({
        model: getCustomLLMModel.data || "",
        api_base: customLLMConnection.data.api_base,
        api_key: customLLMConnection.data.api_key || "",
      });
    } else {
      form.reset({ model: "", api_base: "", api_key: "" });
    }
  }, [getCustomLLMModel.data, customLLMConnection.data, form.reset]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (!form.formState.errors.model && value.model) {
        setCustomLLMModel.mutate(value.model);
      }

      if (!form.formState.errors.api_base && value.api_base) {
        setCustomLLMConnection.mutate({
          api_base: value.api_base,
          api_key: value.api_key || null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const isLocalEndpoint = () => {
    const apiBase = form.watch("api_base");
    return apiBase && (apiBase.includes("localhost") || apiBase.includes("127.0.0.1"));
  };

  const currentLLM: SupportedModelLLM | "custom" = customLLMEnabled.data ? "custom" : "Llama3p2_3bQ4";

  return (
    <RadioGroup
      value={currentLLM}
      onValueChange={(value) => {
        setCustomLLMEnabled.mutate(value === "custom");
      }}
      className="space-y-4"
    >
      <Label
        htmlFor="llama-3.2-3b-q4"
        className={cn(
          "p-4 rounded-lg shadow-sm transition-all duration-150 ease-in-out",
          currentLLM === "Llama3p2_3bQ4"
            ? "border border-blue-500 ring-2 ring-blue-500 bg-blue-50"
            : "border border-neutral-200 bg-white hover:border-neutral-300",
          "cursor-pointer flex flex-col gap-2",
        )}
      >
        <div className="flex items-start justify-between w-full">
          <div className="flex items-center">
            <RadioGroupItem value="llama-3.2-3b-q4" id="llama-3.2-3b-q4" className="peer sr-only" />
            <div className="flex flex-col">
              <span className="font-medium">
                Default (llama-3.2-3b-q4)
              </span>
              <p className="text-xs font-normal text-neutral-500 mt-1">
                <Trans>Use the local Llama 3.2 model for enhanced privacy and offline capability.</Trans>
              </p>
            </div>
          </div>
        </div>
      </Label>

      <Label
        htmlFor="custom"
        className={cn(
          "p-4 rounded-lg shadow-sm transition-all duration-150 ease-in-out",
          currentLLM === "custom"
            ? "border border-blue-500 ring-2 ring-blue-500 bg-blue-50"
            : "border border-neutral-200 bg-white hover:border-neutral-300",
          "cursor-pointer flex flex-col gap-2",
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <RadioGroupItem value="custom" id="custom" className="peer sr-only" />
            <div className="flex flex-col">
              <span className="font-medium">
                <Trans>Custom Endpoint</Trans>
              </span>
              <p className="text-xs font-normal text-neutral-500 mt-1">
                <Trans>Connect to a self-hosted or third-party LLM endpoint (OpenAI API compatible).</Trans>
              </p>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 pt-4 border-t transition-opacity duration-200",
            customLLMEnabled.data ? "opacity-100" : "opacity-50 pointer-events-none",
          )}
        >
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="api_base"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      <Trans>API Base URL</Trans>
                    </FormLabel>
                    <FormDescription className="text-xs">
                      <Trans>
                        Enter the base URL for your custom LLM endpoint (e.g., http://localhost:11434)
                      </Trans>
                    </FormDescription>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="http://localhost:11434"
                        disabled={!customLLMEnabled.data}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("api_base") && !isLocalEndpoint() && (
                <FormField
                  control={form.control}
                  name="api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        <Trans>API Key</Trans>
                      </FormLabel>
                      <FormDescription className="text-xs">
                        <Trans>Enter the API key for your custom LLM endpoint</Trans>
                      </FormDescription>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="sk-..."
                          disabled={!customLLMEnabled.data}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      <Trans>Model Name</Trans>
                    </FormLabel>
                    <FormDescription className="text-xs">
                      <Trans>
                        Select a model from the dropdown (if available) or manually enter the model name required by
                        your endpoint.
                      </Trans>
                    </FormDescription>
                    <FormControl>
                      {availableLLMModels.isLoading
                        ? (
                          <div className="py-1 text-sm text-neutral-500">
                            <Trans>Loading available models...</Trans>
                          </div>
                        )
                        : availableLLMModels.data && availableLLMModels.data.length > 0
                        ? (
                          <Select
                            defaultValue={field.value}
                            onValueChange={(value: string) => {
                              field.onChange(value);
                              setCustomLLMModel.mutate(value);
                            }}
                            disabled={!customLLMEnabled.data}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLLMModels.data.map((model) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )
                        : (
                          <Input
                            {...field}
                            placeholder={t`Enter model name (e.g., gpt-4, llama3.2:3b)`}
                            disabled={!customLLMEnabled.data}
                          />
                        )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
      </Label>
    </RadioGroup>
  );
}
