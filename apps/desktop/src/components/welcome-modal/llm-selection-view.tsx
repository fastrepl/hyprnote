import { Trans } from "@lingui/react/macro";
import { Network, ShieldIcon } from "lucide-react";

import { Card, CardContent } from "@hypr/ui/components/ui/card";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { cn } from "@hypr/ui/lib/utils";
import { useState } from "react";

interface LLMSelectionViewProps {
  onContinue: (selection: "hyprllm" | "byom") => void;
}

export function LLMSelectionView({ onContinue }: LLMSelectionViewProps) {
  const [selected, setSelected] = useState<"hyprllm" | "byom" | null>(null);

  const handleContinue = () => {
    if (selected) {
      onContinue(selected);
    }
  };

  const options = [
    {
      id: "hyprllm",
      title: "HyprLLM (Local)",
      subtitle: "Privacy matters more than anything to me",
      icon: ShieldIcon,
    },
    {
      id: "byom",
      title: "Bring Your Own Model",
      subtitle: "I want first-in-class meeting summarization",
      icon: Network,
    },
  ] as const;

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-lg font-semibold mb-3">
        <Trans>Choose Your LLM</Trans>
      </h2>

      <p className="text-center text-sm text-muted-foreground mb-6">
        <Trans>Select how you want to process your meeting notes</Trans>
      </p>

      <div className="w-full mb-6 px-2 sm:px-4">
        <div className="flex gap-2 sm:gap-4 max-w-xl mx-auto">
          {options.map((option) => {
            const isSelected = selected === option.id;
            const Icon = option.icon;

            return (
              <div key={option.id} className="flex-1">
                <div className="p-0.5 sm:p-1">
                  <Card
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      isSelected
                        ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50"
                        : "hover:border-gray-400",
                    )}
                    onClick={() => setSelected(option.id)}
                  >
                    <CardContent className="flex flex-col gap-1 sm:gap-2 justify-between p-2 sm:p-4 h-32 sm:h-36">
                      <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div
                          className={cn(
                            "flex size-10 sm:size-12 items-center justify-center rounded-full mb-2",
                            isSelected ? "bg-blue-100" : "bg-neutral-50",
                          )}
                        >
                          <Icon
                            className={cn("h-5 w-5 sm:h-6 sm:w-6", isSelected ? "text-blue-600" : "text-neutral-500")}
                          />
                        </div>
                        <div className="text-xs sm:text-sm font-medium mb-1">{option.title}</div>
                        <div className="text-xs text-neutral-600">{option.subtitle}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <PushableButton
        onClick={handleContinue}
        disabled={!selected}
        className="w-full max-w-sm"
      >
        <Trans>Continue</Trans>
      </PushableButton>

      {!selected && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          <Trans>Select an option to continue</Trans>
        </p>
      )}
    </div>
  );
}
