import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BrainIcon, CircleCheckIcon, DownloadIcon, MicIcon } from "lucide-react";

import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";
import { Label } from "@hypr/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@hypr/ui/components/ui/radio-group";
import { showSttModelDownloadToast } from "../../toast/shared";

export default function LocalAI() {
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
      <Accordion type="single" collapsible>
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
          <AccordionContent className="px-2">
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
