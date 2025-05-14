import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { PencilIcon } from "lucide-react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";

export function TranscriptToolbar() {
  const { id } = useParams({ from: "/app/transcript/$id" });

  const title = useQuery({
    queryKey: ["session-title", id],
    queryFn: () => dbCommands.getSession({ id }).then((v) => v?.title),
  });

  const handleSave = () => {
    windowsCommands.windowDestroy({ type: "transcript", value: id });
  };

  const handleCancel = () => {
    windowsCommands.windowDestroy({ type: "transcript", value: id });
  };

  return (
    <header
      data-tauri-drag-region
      className="flex w-full items-center justify-between min-h-11 p-1 px-3 border-b border-border bg-background/80 backdrop-blur-sm"
    >
      <div className="w-40"></div>

      <div
        className="flex-1 flex items-center justify-center"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2">
          <PencilIcon className="w-3 h-3 text-muted-foreground" />
          <h1 className="text-sm font-light truncate max-w-md" data-tauri-drag-region>
            (Transcript) {title.data}
          </h1>
        </div>
      </div>

      <div className="w-40 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </header>
  );
}
