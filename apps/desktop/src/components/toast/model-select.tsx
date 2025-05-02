import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { sonnerToast, toast } from "@hypr/ui/components/ui/toast";

/**
 * Shows a toast notification advising the user to switch their STT model
 * when they change the language settings and are using an English-specific model.
 * @param language The language code that was selected
 */
export async function showModelSelectToast(language: string) {
  const currentModel = await localSttCommands.getCurrentModel();
  const englishModels: SupportedModel[] = ["QuantizedTinyEn", "QuantizedBaseEn", "QuantizedSmallEn"];

  if (!englishModels.includes(currentModel)) {
    return;
  }

  const id = "language-model-mismatch";

  toast({
    id,
    title: "Speech Recognition Model",
    content: (
      <div className="space-y-1">
        <div>
          You've changed your display language. You may need to switch your speech recognition model to match.
        </div>
        <Button
          variant="default"
          onClick={() => {
            windowsCommands.windowShow({ type: "settings" }).then(() => {
              setTimeout(() => {
                window.location.href = "/app/settings?tab=ai";
              }, 500);
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

export default function ModelSelectNotification() {
  return null;
}
