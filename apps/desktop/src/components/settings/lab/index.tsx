import { FlaskConical } from "lucide-react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";

export function SettingsLab() {
  const handleOpenControlWindow = async () => {
    await windowsCommands.windowShow({ type: "control" });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-amber-600">
        <FlaskConical className="w-4 h-4" />
        <span className="text-sm font-medium">
          Experimental features - use at your own risk
        </span>
      </div>

      <div className="border border-neutral-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Control Overlay</h3>
            <p className="text-sm text-neutral-600 mt-1">
              Open a floating control window for quick access to recording
              controls. This window stays on top and can be used during
              meetings.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenControlWindow}>
            Open
          </Button>
        </div>
      </div>
    </div>
  );
}
