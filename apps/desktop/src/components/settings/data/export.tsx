import { Switch } from "@hypr/ui/components/ui/switch";

import * as settings from "../../../store/tinybase/settings";

export function Export() {
  const autoExport = settings.UI.useValue("auto_export", settings.STORE_ID);
  const setAutoExport = settings.UI.useSetValueCallback(
    "auto_export",
    (value: boolean) => value,
    [],
    settings.STORE_ID,
  );

  const autoExportSummary = settings.UI.useValue(
    "auto_export_summary",
    settings.STORE_ID,
  );
  const setAutoExportSummary = settings.UI.useSetValueCallback(
    "auto_export_summary",
    (value: boolean) => value,
    [],
    settings.STORE_ID,
  );

  const autoExportMemo = settings.UI.useValue(
    "auto_export_memo",
    settings.STORE_ID,
  );
  const setAutoExportMemo = settings.UI.useSetValueCallback(
    "auto_export_memo",
    (value: boolean) => value,
    [],
    settings.STORE_ID,
  );

  const autoExportTranscript = settings.UI.useValue(
    "auto_export_transcript",
    settings.STORE_ID,
  );
  const setAutoExportTranscript = settings.UI.useSetValueCallback(
    "auto_export_transcript",
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

          {autoExport && (
            <div className="flex flex-col gap-3 pl-4 border-l-2 border-neutral-200">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Export Summary</span>
                  <span className="text-xs text-neutral-500">
                    Export AI-generated summaries as markdown files.
                  </span>
                </div>
                <Switch
                  checked={autoExportSummary !== false}
                  onCheckedChange={(checked) => setAutoExportSummary(checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Export Memo</span>
                  <span className="text-xs text-neutral-500">
                    Export raw memos as markdown files.
                  </span>
                </div>
                <Switch
                  checked={autoExportMemo !== false}
                  onCheckedChange={(checked) => setAutoExportMemo(checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Export Transcript</span>
                  <span className="text-xs text-neutral-500">
                    Export transcripts as VTT subtitle files.
                  </span>
                </div>
                <Switch
                  checked={autoExportTranscript !== false}
                  onCheckedChange={(checked) =>
                    setAutoExportTranscript(checked)
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
