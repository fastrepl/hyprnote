import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";

import { commands as dbCommands, type ConfigGeneral } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Textarea } from "@hypr/ui/components/ui/textarea";

export function InstructionChip({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const configQuery = useQuery({
    queryKey: ["config", "general"],
    queryFn: async () => await dbCommands.getConfig(),
  });

  const [text, setText] = useState("");

  useEffect(() => {
    if (configQuery.data?.general?.jargons) {
      setText((configQuery.data.general.jargons ?? []).join(", "));
    }
  }, [configQuery.data]);

  const mutation = useMutation({
    mutationFn: async (newJargonsString: string) => {
      if (!configQuery.data) {
        console.error("Cannot save jargons: config not loaded.");
        return;
      }
      const nextGeneral: ConfigGeneral = {
        ...(configQuery.data.general ?? {}),
        jargons: newJargonsString.split(",").map((j) => j.trim()).filter(Boolean),
      };
      await dbCommands.setConfig({
        ...configQuery.data,
        general: nextGeneral,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "general"] });
    },
    onError: (error) => {
      console.error("Failed to save jargons:", error);
    },
  });

  const handleSaveJargons = () => {
    const currentConfigJargons = (configQuery.data?.general?.jargons ?? []).join(", ");
    if (text !== currentConfigJargons) {
      mutation.mutate(text);
    }
  };

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) {
          handleSaveJargons();
        }
      }}
    >
      <PopoverTrigger asChild>
        <button className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 text-xs text-neutral-800">
          <Info size={14} className="text-neutral-600 flex-shrink-0" />
          <Trans>Instruction</Trans>
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="shadow-lg w-80 flex flex-col gap-3">
        <div className="text-sm font-medium text-neutral-700">Custom instruction</div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ex) Hyprnote, JDCE, Fastrepl, John, Yujong"
          className="min-h-[80px] resize-none border-neutral-300 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          autoFocus
        />

        <p className="text-xs text-neutral-400">
          Provide descriptions about the meeting. Company specific terms, acronyms, jargons... any thing!
        </p>
      </PopoverContent>
    </Popover>
  );
}
