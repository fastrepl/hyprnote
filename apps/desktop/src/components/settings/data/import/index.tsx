import { open } from "@tauri-apps/plugin-dialog";
import {
  CheckCircleIcon,
  Loader2Icon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import {
  importFromFile,
  type ImportResult,
} from "../../../../store/tinybase/importer";
import * as main from "../../../../store/tinybase/main";
import { save } from "../../../../store/tinybase/save";

type ImportState =
  | { status: "idle" }
  | { status: "importing" }
  | { status: "success"; tablesImported: number; valuesImported: number }
  | { status: "error"; error: string };

export function Import() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [importState, setImportState] = useState<ImportState>({
    status: "idle",
  });
  const store = main.UI.useStore(main.STORE_ID) as main.Store | undefined;

  const handleSelectFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (selected) {
      setSelectedFile(selected);
      setImportState({ status: "idle" });
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile || !store) {
      return;
    }

    setImportState({ status: "importing" });

    try {
      const result: ImportResult = await importFromFile(
        store,
        selectedFile,
        save,
      );

      if (result.status === "success") {
        setImportState({
          status: "success",
          tablesImported: result.tablesImported,
          valuesImported: result.valuesImported,
        });
      } else if (result.status === "error") {
        setImportState({ status: "error", error: result.error });
      }
    } catch (err) {
      console.error("[Import] Unexpected error:", err);
      setImportState({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [selectedFile, store]);

  return (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col gap-3">
        <h3 className="text-md font-semibold">Import Data</h3>
        <p className="text-sm text-neutral-600">
          Select a JSON file to import data into Hyprnote. The file should be in
          the format [tables, values] as exported by Hyprnote.
        </p>

        <div className="flex flex-col gap-4 p-4 rounded-xl border bg-neutral-50">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSelectFile}
              variant="outline"
              className="w-fit gap-2"
            >
              <UploadIcon size={16} />
              Select File
            </Button>

            {selectedFile && (
              <Button
                onClick={handleImport}
                disabled={importState.status === "importing"}
                className="w-fit gap-2"
              >
                {importState.status === "importing" && (
                  <Loader2Icon size={16} className="animate-spin" />
                )}
                Import
              </Button>
            )}
          </div>

          {selectedFile && (
            <div className="text-sm text-neutral-600">
              <span className="font-medium">Selected:</span> {selectedFile}
            </div>
          )}

          {importState.status === "success" && (
            <div
              className={cn([
                "flex items-center gap-2 text-sm text-green-600",
                "p-3 rounded-lg bg-green-50 border border-green-200",
              ])}
            >
              <CheckCircleIcon size={16} />
              <span>
                Successfully imported {importState.tablesImported} table(s) and{" "}
                {importState.valuesImported} value(s).
              </span>
            </div>
          )}

          {importState.status === "error" && (
            <div
              className={cn([
                "flex items-center gap-2 text-sm text-red-600",
                "p-3 rounded-lg bg-red-50 border border-red-200",
              ])}
            >
              <XCircleIcon size={16} />
              <span>Import failed: {importState.error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
