import { Trans } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CpuIcon } from "lucide-react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";

export default function LocalAI() {
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
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
