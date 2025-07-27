import type { LinkProps } from "@tanstack/react-router";

import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { sonnerToast, toast } from "@hypr/ui/components/ui/toast";

export async function showModelSelectToast(language: string) {
  const currentModel = await localSttCommands.getCurrentModel();
  const englishModels: SupportedModel[] = ["QuantizedTinyEn", "QuantizedBaseEn", "QuantizedSmallEn"];

  if (language === "en" || !englishModels.includes(currentModel)) {
    return;
  }

  const handleClick = () => {
    const url = { to: "/app/settings", search: { tab: "ai" } } as const satisfies LinkProps;

    windowsCommands.windowShow({ type: "settings" }).then(() => {
      setTimeout(() => {
        windowsCommands.windowEmitNavigate({ type: "settings" }, {
          path: url.to,
          search: url.search,
        });
      }, 500);
    });

    sonnerToast.dismiss(id);
  };

  const id = "language-model-mismatch";
  // TODO: this should not pop up if using Cloud
  toast({
    id,
    title: "Speech-to-Text Model Mismatch",
    content: (
      <div className="space-y-2">
        <div>
          English-only model can not be used with non-English languages.
        </div>
        <Button
          variant="default"
          onClick={handleClick}
        >
          Open AI Settings
        </Button>
      </div>
    ),
    dismissible: true,
  });
}
