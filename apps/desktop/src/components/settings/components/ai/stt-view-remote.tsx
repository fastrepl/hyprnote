import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from "@hypr/ui/components/ui/form";
import { Input } from "@hypr/ui/components/ui/input";
import { cn } from "@hypr/ui/lib/utils";

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
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    <Trans>Custom Speech-to-Text endpoint</Trans>
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Preview
                  </span>
                </div>
                <p className="text-xs font-normal text-neutral-500 mt-1">
                  <Trans>
                    Connect to{" "}
                    <span
                      className="text-blue-500 hover:underline"
                      onClick={() => openUrl("https://deepgram.com")}
                    >
                      Deepgram
                    </span>{" "}
                    directly, or use{" "}
                    <span
                      className="text-blue-500 hover:underline"
                      onClick={() => openUrl("https://docs.hyprnote.com/owhisper/what-is-this")}
                    >
                      OWhisper
                    </span>{" "}
                    for other provider support.
                  </Trans>
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 border-t">
            <div className="mt-4">
              <Form {...form}>
                <form className="space-y-6">
                  {/* Base URL Section */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">
                      <Trans>Base URL</Trans>
                    </h3>
                    <FormField
                      control={form.control}
                      name="api_base"
                      render={({ field }) => (
                        <FormItem>
                          <FormDescription className="text-xs">
                            <Trans>Enter the base URL for your custom STT endpoint</Trans>
                          </FormDescription>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://api.deepgram.com"
                              className="placeholder:text-gray-400"
                              onClick={(e) => e.stopPropagation()}
                              onFocus={() => setProviderToCustom()}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* API Key Section */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">
                      <Trans>API Key</Trans>
                    </h3>
                    <FormField
                      control={form.control}
                      name="api_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormDescription className="text-xs">
                            <Trans>Your authentication key for accessing the STT service</Trans>
                          </FormDescription>
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
                  </div>

                  {/* Model Section */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">
                      <Trans>Model</Trans>
                    </h3>
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormDescription className="text-xs">
                            <Trans>Enter the model name required by your STT endpoint</Trans>
                          </FormDescription>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="nova-2"
                              onClick={(e) => e.stopPropagation()}
                              onFocus={() => setProviderToCustom()}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
