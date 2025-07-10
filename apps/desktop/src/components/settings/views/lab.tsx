import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ClipboardListIcon, CloudLightningIcon, RotateCcwIcon } from "lucide-react";

import { commands } from "@/types";
import { commands as flagsCommands } from "@hypr/plugin-flags";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { Switch } from "@hypr/ui/components/ui/switch";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export default function Lab() {
  return (
    <div>
      <div className="space-y-4">
        <CloudPreview />
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-4 text-muted-foreground">
            <Trans>Debug</Trans>
          </h3>
          <div className="space-y-4">
            <ResetOnboarding />
            <ShowSurvey />
          </div>
        </div>
      </div>
    </div>
  );
}

function CloudPreview() {
  const flagQuery = useQuery({
    queryKey: ["flags", "CloudPreview"],
    queryFn: () => flagsCommands.isEnabled("CloudPreview"),
  });

  const flagMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) {
        flagsCommands.enable("CloudPreview");
      } else {
        flagsCommands.disable("CloudPreview");
      }
    },
    onSuccess: () => {
      flagQuery.refetch();
    },
  });

  const handleToggle = (enabled: boolean) => {
    flagMutation.mutate(enabled);
  };

  return (
    <FeatureFlag
      title="Hyprnote Cloud"
      description="Access to the latest AI model for Hyprnote Pro"
      icon={<CloudLightningIcon />}
      enabled={flagQuery.data ?? false}
      onToggle={handleToggle}
    />
  );
}

function ResetOnboarding() {
  const resetMutation = useMutation({
    mutationFn: async () => {
      await commands.setOnboardingNeeded(true);
      await commands.setIndividualizationNeeded(true);
    },
    onSuccess: async () => {
      try {
        // Close the settings window
        const currentWindow = getCurrentWebviewWindow();
        await currentWindow.close();

        // Show the main window which should trigger onboarding
        windowsCommands.windowShow({ type: "main" });
      } catch (error) {
        console.error("Failed to reload main window:", error);
        // Fallback: just reload current window
        window.location.reload();
      }
    },
    onError: (error) => {
      console.error("Failed to reset onboarding:", error);
    },
  });

  const handleReset = () => {
    resetMutation.mutate();
  };

  return (
    <div className="flex flex-col rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center">
            <RotateCcwIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium">
              <Trans>Reset Onboarding</Trans>
            </div>
            <div className="text-xs text-muted-foreground">
              <Trans>Show the welcome flow and setup validator again</Trans>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? <Trans>Resetting...</Trans> : <Trans>Reset</Trans>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShowSurvey() {
  const showSurveyMutation = useMutation({
    mutationFn: async () => {
      await commands.setIndividualizationNeeded(true);
    },
    onSuccess: async () => {
      try {
        // Close the settings window
        const currentWindow = getCurrentWebviewWindow();
        await currentWindow.close();

        // Show the main window which should trigger survey
        windowsCommands.windowShow({ type: "main" });
      } catch (error) {
        console.error("Failed to reload main window:", error);
        // Fallback: just reload current window
        window.location.reload();
      }
    },
    onError: (error) => {
      console.error("Failed to show survey:", error);
    },
  });

  const handleShow = () => {
    showSurveyMutation.mutate();
  };

  return (
    <div className="flex flex-col rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center">
            <ClipboardListIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium">
              <Trans>Show Survey</Trans>
            </div>
            <div className="text-xs text-muted-foreground">
              <Trans>Show the individualization survey again</Trans>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShow}
            disabled={showSurveyMutation.isPending}
          >
            {showSurveyMutation.isPending ? <Trans>Showing...</Trans> : <Trans>Show</Trans>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeatureFlag({
  title,
  description,
  icon,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex flex-col rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center">
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium">
              <Trans>{title}</Trans>
            </div>
            <div className="text-xs text-muted-foreground">
              <Trans>{description}</Trans>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}
