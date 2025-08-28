import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
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
import { cn } from "@hypr/ui/lib/utils";
import { useForm } from "react-hook-form";

export function STTViewRemote({
  provider,
  setProviderToCustom,
}: {
  provider: "Local" | "Custom";
  setProviderToCustom: () => void;
}) {
  const apiBaseQuery = useQuery({
    queryKey: ["custom-stt-base-url"],
    queryFn: () => localSttCommands.getCustomBaseUrl(),
  });

  const apiKeyQuery = useQuery({
    queryKey: ["custom-stt-api-key"],
    queryFn: () => localSttCommands.getCustomApiKey(),
  });

  const modelQuery = useQuery({
    queryKey: ["custom-stt-model"],
    queryFn: () => localSttCommands.getCustomModel(),
  });

  const setApiBaseMutation = useMutation({
    mutationFn: (apiBase: string) => localSttCommands.setCustomBaseUrl(apiBase),
    onSuccess: () => apiBaseQuery.refetch(),
  });

  const setApiKeyMutation = useMutation({
    mutationFn: (apiKey: string) => localSttCommands.setCustomApiKey(apiKey),
    onSuccess: () => apiKeyQuery.refetch(),
  });

  const setModelMutation = useMutation({
    mutationFn: (model: string) => localSttCommands.setCustomModel(model),
    onSuccess: () => modelQuery.refetch(),
  });

  const form = useForm({
    defaultValues: {
      api_base: "",
      api_key: "",
      model: "",
    },
  });

  useEffect(() => {
    form.reset({
      api_base: apiBaseQuery.data || "",
      api_key: apiKeyQuery.data || "",
      model: modelQuery.data || "",
    });
  }, [apiBaseQuery.data, apiKeyQuery.data, modelQuery.data, form]);

  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      if (name === "api_base") {
        setApiBaseMutation.mutate(values.api_base || "");
      }
      if (name === "api_key") {
        setApiKeyMutation.mutate(values.api_key || "");
      }
      if (name === "model") {
        setModelMutation.mutate(values.model || "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, setApiBaseMutation, setApiKeyMutation, setModelMutation]);

  const isSelected = provider === "Custom";

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        {/* Custom STT Endpoint Box */}
        <div
          className={cn(
            "border rounded-lg transition-all duration-150 ease-in-out cursor-pointer",
            isSelected
              ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50"
              : "border-neutral-200 bg-white hover:border-neutral-300",
          )}
          onClick={() => {
            setProviderToCustom();
          }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-medium">
                  <Trans>Custom STT Endpoint</Trans>
                </span>
                <p className="text-xs font-normal text-neutral-500 mt-1">
                  <Trans>Connect to a self-hosted or third-party STT endpoint (Deepgram compatible)</Trans>
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 border-t">
            <div className="mt-4">
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
                          <Trans>Enter the base URL for your custom STT endpoint</Trans>
                        </FormDescription>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://api.example.com/v1"
                            onClick={(e) => e.stopPropagation()}
                            onFocus={() => setProviderToCustom()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          <Trans>API Key</Trans>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="your-api-key"
                            onClick={(e) => e.stopPropagation()}
                            onFocus={() => setProviderToCustom()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          <Trans>Model Name</Trans>
                        </FormLabel>
                        <FormDescription className="text-xs">
                          <Trans>Enter the model name required by your STT endpoint</Trans>
                        </FormDescription>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="whisper-1"
                            onClick={(e) => e.stopPropagation()}
                            onFocus={() => setProviderToCustom()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
