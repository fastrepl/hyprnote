import { FlaskConicalIcon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";

import { useTabs } from "../../../store/zustand/tabs";

export function LabSettings() {
  const openNew = useTabs((state) => state.openNew);

  return (
    <div>
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <FlaskConicalIcon className="w-4 h-4" />
        Lab
      </h2>
      <div className="flex flex-col gap-3 p-4 rounded-xl border bg-neutral-50">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Open Data in New Tab</span>
            <span className="text-xs text-neutral-500">
              Open the Data panel in a dedicated tab (experimental)
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openNew({ type: "data", state: { tab: "import" } })}
          >
            Open
          </Button>
        </div>
      </div>
    </div>
  );
}
