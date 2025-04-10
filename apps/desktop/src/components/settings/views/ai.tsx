import { Trans } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";

import { CpuIcon } from "lucide-react";
import { EnhancingModel } from "../components/ai/enhancing-model";
import { TranscribingModel } from "../components/ai/transcribing-model";

export default function LocalAI() {
  const queryClient = useQueryClient();

  const sttRunning = useQuery({
    queryKey: ["local-stt", "running"],
    queryFn: async () => localSttCommands.isServerRunning(),
    refetchInterval: 3000,
  });

  const llmRunning = useQuery({
    queryKey: ["local-llm", "running"],
    queryFn: async () => localLlmCommands.isServerRunning(),
    refetchInterval: 3000,
  });

  return (
    <div className="space-y-6 -mt-3">
      <Accordion type="single" collapsible defaultValue="local">
        <AccordionItem value="local">
          <AccordionTrigger>
            <div className="flex flex-row items-center gap-2">
              <CpuIcon size={16} />
              <span className="text-sm">
                <Trans>Local AI</Trans>
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2">
            <div className="space-y-2">
              <TranscribingModel
                isRunning={!!sttRunning.data}
                queryClient={queryClient}
              />
              <EnhancingModel
                isRunning={!!llmRunning.data}
                queryClient={queryClient}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
