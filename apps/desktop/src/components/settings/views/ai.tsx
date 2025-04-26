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
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from "@hypr/ui/components/ui/form";
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
    (value) => ["localhost", "127.0.0.1"].some((host) => value.includes(host)),
    { message: "Only one of 'localhost' or '127.0.0.1' are allowed as the host" },
  ).refine(
    (value) => value.endsWith("/v1"),
    { message: "Should end with '/v1'" },
  ).refine(
    (value) => !value.includes("chat/completions"),
    { message: "`/chat/completions` will be appended automatically" },
  ),
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
    });
  }, [getCustomLLMModel.data, customLLMConnection.data]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (!form.formState.errors.model && value.model) {
        setCustomLLMModel.mutate(value.model);
        console.log("setCustomLLMModel", value.model);
      }

      if (!form.formState.errors.api_base && value.api_base) {
        setCustomLLMConnection.mutate({
          api_base: value.api_base,
          api_key: customLLMConnection.data?.api_key ?? null,
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

  return (
    <div className="space-y-6 -mt-3">
      <Accordion type="single" collapsible defaultValue="">
        <AccordionItem value="stt">
          <AccordionTrigger>
            <div className="flex flex-row items-center gap-2">
              <MicIcon size={16} />
              <span className="text-sm">
                <Trans>Speech-to-Text Model</Trans>
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2">
            <RadioGroup
              value={currentSTTModel.data}
              onValueChange={setCurrentSTTModel.mutate}
              disabled={supportedSTTModels.isLoading}
              className="space-y-2"
            >
              {supportedSTTModels.data?.map(({ model, isDownloaded }) => (
                <div key={model} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={model} id={`model-${model}`} disabled={!isDownloaded} />
                    <Label htmlFor={`model-${model}`} className="flex items-center cursor-pointer">
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
                  >
                    {isDownloaded ? <CircleCheckIcon size={16} /> : <DownloadIcon size={16} />}
                  </Button>
                </div>
              ))}
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="llm">
          <AccordionTrigger>
            <div className="flex flex-row items-center gap-2">
              <BrainIcon size={16} />
              <span className="text-sm">
                <Trans>Language Model</Trans>
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-2">
            <RadioGroup
              value={customLLMEnabled.data ? "custom" : "llama-3.2-3b-q4"}
              onValueChange={(value) => {
                setCustomLLMEnabled.mutate(value === "custom");
              }}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="llama-3.2-3b-q4" id="model-llama-3-2" />
                <Label htmlFor="model-llama-3-2" className="flex items-center cursor-pointer">
                  <span>llama-3.2-3b-q4</span>
                </Label>
              </div>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="model-custom" />
                  <Label htmlFor="model-custom" className="flex items-center cursor-pointer">
                    <span>Custom LLM Endpoint</span>
                  </Label>
                </div>
                <div className="pl-6">
                  <Form {...form}>
                    <form className="space-y-2">
                      <FormField
                        control={form.control}
                        name="api_base"
                        render={({ field }) => (
                          <FormItem>
                            <FormDescription>
                              <Trans>Enter the URL for your custom LLM endpoint</Trans>
                            </FormDescription>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="http://127.0.0.1:9999/v1"
                                disabled={!customLLMEnabled.data}
                                className="focus-visible:ring-0 focus-visible:ring-offset-0"
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
                          <Select
                            {...field}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                              {customLLMModels.data?.map((model) => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </form>
                  </Form>
                </div>
              </div>
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
