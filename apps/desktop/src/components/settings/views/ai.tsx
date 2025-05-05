import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BrainIcon, CircleCheckIcon, DownloadIcon, MicIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { commands as connectorCommands, type Connection } from "@hypr/plugin-connector";
import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";
import { Card, CardContent } from "@hypr/ui/components/ui/card";
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
import { showSttModelDownloadToast } from "../../toast/shared";

const endpointSchema = z.object({
  model: z.string().min(1),
  api_base: z.string().url({ message: "Please enter a valid URL" }).min(1, { message: "URL is required" }).refine(
    (value) => !value.includes("192"),
    { message: "Should use 'localhost' or '127.0.0.1' as the host" },
  ).refine(
    (value) => ["localhost", "127.0.0.1", "openrouter.ai", "api.openai.com"].some((host) => value.includes(host)),
    { message: "Only one of 'localhost', '127.0.0.1', 'openrouter.ai', or 'api.openai.com' are allowed as the host" },
  ).refine(
    (value) => value.endsWith("/v1"),
    { message: "Should end with '/v1'" },
  ).refine(
    (value) => !value.includes("chat/completions"),
    { message: "`/chat/completions` will be appended automatically" },
  ),
  api_key: z.string().optional(),
});
type FormValues = z.infer<typeof endpointSchema>;

export default function LocalAI() {
  const customLLMConnection = useQuery({
    queryKey: ["custom-llm-connection"],
    queryFn: () => connectorCommands.getCustomLlmConnection(),
  });

  const getCustomLLMModel = useQuery({
    queryKey: ["custom-llm-model"],
    queryFn: () => connectorCommands.getCustomLlmModel(),
  });

  const setCustomLLMModel = useMutation({
    mutationFn: (model: string) => connectorCommands.setCustomLlmModel(model),
    onSuccess: () => {
      customLLMModels.refetch();
    },
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

  const customLLMModels = useQuery({
    queryKey: ["custom-llm-models"],
    queryFn: () => connectorCommands.listCustomLlmModels(),
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
    form.reset({
      model: getCustomLLMModel.data || "",
      api_base: customLLMConnection.data?.api_base || "",
      api_key: customLLMConnection.data?.api_key || "",
    });
  }, [getCustomLLMModel.data, customLLMConnection.data]);

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

  const currentSTTModel = useQuery({
    queryKey: ["local-stt", "current-model"],
    queryFn: () => localSttCommands.getCurrentModel(),
  });

  const setCurrentSTTModel = useMutation({
    mutationFn: (model: SupportedModel) => localSttCommands.setCurrentModel(model),
    onSuccess: () => {
      currentSTTModel.refetch();
    },
  });

  const supportedSTTModels = useQuery({
    queryKey: ["local-stt", "supported-models"],
    queryFn: async () => {
      const models = await localSttCommands.listSupportedModels();
      const downloadedModels = await Promise.all(models.map((model) => localSttCommands.isModelDownloaded(model)));
      return models.map((model, index) => ({ model, isDownloaded: downloadedModels[index] }));
    },
  });

  const isLocalEndpoint = () => {
    const apiBase = form.watch("api_base");
    return apiBase && (apiBase.includes("localhost") || apiBase.includes("127.0.0.1"));
  };

  const shouldShowModelsField = () => {
    const apiBase = form.watch("api_base");
    const apiKey = form.watch("api_key");

    if (!apiBase) {
      return false;
    }
    if (isLocalEndpoint()) {
      return true;
    }
    return apiKey && apiKey.length > 1;
  };

  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible className="space-y-2">
        <AccordionItem value="stt" className="border dark:border-zinc-700 rounded-md overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:bg-neutral-50 dark:hover:bg-zinc-800">
            <div className="flex items-center gap-2">
              <MicIcon size={18} className="text-neutral-500" />
              <span className="font-medium">
                <Trans>Speech-to-Text Model</Trans>
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-2 pb-4">
            <Card className="border-0 shadow-none">
              <CardContent className="p-0">
                <RadioGroup
                  value={currentSTTModel.data}
                  onValueChange={setCurrentSTTModel.mutate}
                  disabled={supportedSTTModels.isLoading}
                  className="space-y-3"
                >
                  {supportedSTTModels.data?.map(({ model, isDownloaded }) => (
                    <div key={model} className="flex items-center justify-between rounded-md p-2 hover:bg-neutral-50 dark:hover:bg-zinc-800">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value={model} id={`model-${model}`} disabled={!isDownloaded} />
                        <Label htmlFor={`model-${model}`} className="flex items-center cursor-pointer font-medium">
                          <span>{model}</span>
                        </Label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isDownloaded}
                        onClick={() => {
                          if (!isDownloaded) {
                            showSttModelDownloadToast(model, () => {
                              supportedSTTModels.refetch();
                            });
                          }
                        }}
                        className="gap-1"
                      >
                        {isDownloaded
                          ? (
                            <>
                              <CircleCheckIcon size={16} className="text-green-500" />
                              <span>
                                <Trans>Downloaded</Trans>
                              </span>
                            </>
                          )
                          : (
                            <>
                              <DownloadIcon size={16} />
                              <span>
                                <Trans>Download</Trans>
                              </span>
                            </>
                          )}
                      </Button>
                    </div>
                  ))}
                  {!supportedSTTModels.data?.length && (
                    <div className="text-sm text-neutral-500 py-2">
                      <Trans>No speech-to-text models available</Trans>
                    </div>
                  )}
                </RadioGroup>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="llm" className="border dark:border-zinc-700 rounded-md overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:bg-neutral-50 dark:hover:bg-zinc-800">
            <div className="flex items-center gap-2">
              <BrainIcon size={18} className="text-neutral-500" />
              <span className="font-medium">
                <Trans>Language Model</Trans>
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-2 pb-4">
            <Card className="border-0 shadow-none">
              <CardContent className="p-0">
                <RadioGroup
                  value={customLLMEnabled.data ? "custom" : "llama-3.2-3b-q4"}
                  onValueChange={(value) => {
                    setCustomLLMEnabled.mutate(value === "custom");
                  }}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-3 rounded-md p-2 hover:bg-neutral-50 dark:hover:bg-zinc-800">
                    <RadioGroupItem value="llama-3.2-3b-q4" id="model-llama-3-2" />
                    <Label htmlFor="model-llama-3-2" className="flex items-center cursor-pointer font-medium">
                      <span>llama-3.2-3b-q4</span>
                    </Label>
                  </div>

                  <div className="rounded-md border border-neutral-200 dark:border-zinc-700 p-3">
                    <div className="flex items-center space-x-3 mb-3">
                      <RadioGroupItem value="custom" id="model-custom" />
                      <Label htmlFor="model-custom" className="flex items-center cursor-pointer font-medium">
                        <span>
                          <Trans>Custom LLM Endpoint</Trans>
                        </span>
                      </Label>
                    </div>

                    <div className="pl-7 space-y-4">
                      <Form {...form}>
                        <form className="space-y-4">
                          <FormField
                            control={form.control}
                            name="api_base"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  <Trans>API Base</Trans>
                                </FormLabel>
                                <FormDescription className="text-xs">
                                  <Trans>Enter the URL for your custom LLM endpoint</Trans>
                                </FormDescription>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="http://127.0.0.1:9999/v1"
                                    disabled={!customLLMEnabled.data}
                                    className="focus-visible:ring-1 focus-visible:ring-offset-0"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {!isLocalEndpoint() && (
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
                                      className="focus-visible:ring-1 focus-visible:ring-offset-0"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          {shouldShowModelsField() && (
                            <FormField
                              control={form.control}
                              name="model"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">
                                    <Trans>Model</Trans>
                                  </FormLabel>
                                  <FormControl>
                                    <Select
                                      disabled={!customLLMEnabled.data}
                                      onValueChange={field.onChange}
                                      value={field.value}
                                    >
                                      <SelectTrigger className="focus-visible:ring-1 focus-visible:ring-offset-0">
                                        <SelectValue placeholder="Select a model" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {customLLMModels.data?.map((model) => (
                                          <SelectItem key={model} value={model}>{model}</SelectItem>
                                        ))}
                                        {!customLLMModels.data?.length && (
                                          <div className="text-sm text-neutral-500 p-2">
                                            <Trans>No models available</Trans>
                                          </div>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </form>
                      </Form>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
