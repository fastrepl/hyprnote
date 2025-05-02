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

  const id = "language-model-mismatch";

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
          onClick={() => {
            windowsCommands.windowShow({ type: "settings" }).then(() => {
              windowsCommands.windowEmitNavigate({ type: "settings" }, "/app/settings?tab=ai");
            });

            sonnerToast.dismiss(id);
          }}
        >
          Open AI Settings
        </Button>
      </div>
    ),
    dismissible: true,
  });
}
