import { Switch } from "@hypr/ui/components/ui/switch";

import * as settings from "../../../../store/tinybase/settings";

export function Export() {
  const autoExport = settings.UI.useValue("auto_export", settings.STORE_ID);
  const setAutoExport = settings.UI.useSetValueCallback(
    "auto_export",
    (value: boolean) => value,
    [],
    settings.STORE_ID,
  );

  return (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col gap-3">
        <h3 className="text-md font-semibold">Export Configuration</h3>
        <p className="text-sm text-neutral-600">
          Configure how your data is stored and exported.
        </p>

        <div className="flex flex-col gap-4 p-4 rounded-xl border bg-neutral-50">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Auto Export</span>
              <span className="text-xs text-neutral-500">
                With no export, data is stored in an encrypted database. If
                enabled, data is replicated in the file system without
                encryption.
              </span>
            </div>
            <Switch
              checked={autoExport ?? false}
              onCheckedChange={(checked) => setAutoExport(checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
