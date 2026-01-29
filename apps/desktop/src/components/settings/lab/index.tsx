import { useQuery } from "@tanstack/react-query";
import { getIdentifier } from "@tauri-apps/api/app";
import { arch, platform } from "@tauri-apps/plugin-os";

import { commands as openerCommands } from "@hypr/plugin-opener2";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";

export function SettingsLab() {
  const handleOpenControlWindow = async () => {
    await windowsCommands.windowShow({ type: "control" });
  };

  const identifierQuery = useQuery({
    queryKey: ["app-identifier"],
    queryFn: () => getIdentifier(),
    staleTime: Infinity,
  });

  const isStable = identifierQuery.data === "com.hyprnote.stable";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium mb-1">Control Overlay</h3>
          <p className="text-xs text-neutral-600">
            Open a floating control window for quick access to recording
            controls. This window stays on top and can be used during meetings.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenControlWindow}>
          Open
        </Button>
      </div>

      {isStable && <DownloadNightlyButton />}
    </div>
  );
}

function DownloadNightlyButton() {
  const platformName = platform();
  const archQuery = useQuery({
    queryKey: ["target-arch"],
    queryFn: () => arch(),
    staleTime: Infinity,
  });

  const getNightlyDownloadUrl = () => {
    const targetArch = archQuery.data;
    if (platformName === "macos") {
      if (targetArch === "aarch64") {
        return "https://desktop2.hyprnote.com/download/latest/dmg-aarch64?channel=nightly";
      }
      return "https://desktop2.hyprnote.com/download/latest/dmg-x86_64?channel=nightly";
    }
    if (platformName === "linux") {
      return "https://desktop2.hyprnote.com/download/latest/appimage-x86_64?channel=nightly";
    }
    return null;
  };

  const downloadUrl = getNightlyDownloadUrl();

  const handleDownload = async () => {
    if (downloadUrl) {
      await openerCommands.openUrl(downloadUrl, null);
    }
  };

  if (!downloadUrl) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-1">Nightly Build</h3>
        <p className="text-xs text-neutral-600">
          Download the latest nightly build to try new features before they are
          released. Nightly builds may be less stable.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={handleDownload}>
        Download
      </Button>
    </div>
  );
}
