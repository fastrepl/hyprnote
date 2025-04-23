import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BrainIcon, CircleCheckIcon, DownloadIcon, MicIcon } from "lucide-react";

import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Label } from "@hypr/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@hypr/ui/components/ui/radio-group";
import { showSttModelDownloadToast } from "../../toast/shared";

export default function LocalAI() {
  const customLLMConnection = useQuery({
    queryKey: ["custom-llm-connection"],
    queryFn: () => connectorCommands.getCustomLlmConnection(),
  });

  // const setCustomLLMConnection = useMutation({
  //   mutationFn: (connection: Connection) => connectorCommands.setCustomLlmConnection(connection),
  // });

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
            <RadioGroup value={"model-llama-3-2"} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="llama-3.2-3b-q8" id="model-llama-3-2" />
                <Label htmlFor="model-llama-3-2" className="flex items-center cursor-pointer">
                  <span>llama-3.2-3b-q8</span>
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
                  <Input
                    placeholder="Enter custom endpoint URL"
                    value={customLLMConnection.data?.api_base}
                  />
                </div>
              </div>
            </RadioGroup>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
