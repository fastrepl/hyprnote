import { useMutation, useQuery } from "@tanstack/react-query";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { CheckCircleIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import {
  commands,
  type ImportSourceInfo,
  type ImportSourceKind,
} from "@hypr/plugin-importer";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import {
  importFromFile,
  type ImportResult,
} from "../../../store/tinybase/importer";
import { STORE_ID, UI } from "../../../store/tinybase/main";

export function Import() {
  const [dryRunCompleted, setDryRunCompleted] =
    useState<ImportSourceKind | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const store = UI.useStore(STORE_ID);
  const persister = UI.usePersister(STORE_ID);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const setupListener = async () => {
      unlisten = await listen<string>("importer://ready", async (event) => {
        if (!store || !persister) {
          console.error("[Import] Store or persister not available");
          return;
        }

        const filePath = event.payload;
        console.log("[Import] Received import ready event, file:", filePath);

        const result = await importFromFile(store, filePath, async () => {
          await persister.save();
        });

        setImportResult(result);
      });
    };

    void setupListener();

    return () => {
      unlisten?.();
    };
  }, [store, persister]);

  const { data: sources } = useQuery({
    queryKey: ["import-sources"],
    queryFn: async () => {
      const result = await commands.listAvailableSources();
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const importMutation = useMutation({
    mutationFn: async (source: ImportSourceKind) => {
      const result = await commands.runImport(source);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return source;
    },
    onSuccess: (source) => {
      void analyticsCommands.event({
        event: "data_imported",
        source,
      });
      setDryRunCompleted(null);
    },
  });

  const dryImportMutation = useMutation({
    mutationFn: async (source: ImportSourceKind) => {
      const result = await commands.runImportDry(source);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return source;
    },
    onSuccess: (source) => {
      setDryRunCompleted(source);
    },
  });

  const isPending = importMutation.isPending || dryImportMutation.isPending;

  return (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col gap-3">
        <h3 className="text-md font-semibold">Import Data</h3>
        <p className="text-sm text-neutral-600">
          Import data from other sources into Hyprnote.
        </p>

        <div className="flex flex-col gap-4 p-4 rounded-xl border bg-neutral-50">
          <div className="flex flex-col gap-2">
            {sources?.map((source: ImportSourceInfo) => (
              <SourceItem
                key={source.kind}
                source={source}
                onDryRun={dryImportMutation.mutate}
                onConfirm={importMutation.mutate}
                isConfirmMode={dryRunCompleted === source.kind}
                disabled={isPending}
              />
            ))}
          </div>

          {dryImportMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Loader2Icon size={16} className="animate-spin" />
              <span>Running dry run...</span>
            </div>
          )}

          {importMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Loader2Icon size={16} className="animate-spin" />
              <span>Importing...</span>
            </div>
          )}

          {(importMutation.isSuccess || importResult?.status === "success") && (
            <div
              className={cn([
                "flex items-center gap-2 text-sm text-green-600",
                "p-3 rounded-lg bg-green-50 border border-green-200",
              ])}
            >
              <CheckCircleIcon size={16} />
              <span>
                {importResult?.status === "success"
                  ? `Import completed: ${importResult.tablesImported} tables imported.`
                  : "Import completed successfully."}
              </span>
            </div>
          )}

          {importResult?.status === "error" && (
            <div
              className={cn([
                "flex items-center gap-2 text-sm text-red-600",
                "p-3 rounded-lg bg-red-50 border border-red-200",
              ])}
            >
              <XCircleIcon size={16} />
              <span>Import failed: {importResult.error}</span>
            </div>
          )}

          {(importMutation.isError || dryImportMutation.isError) && (
            <div
              className={cn([
                "flex items-center gap-2 text-sm text-red-600",
                "p-3 rounded-lg bg-red-50 border border-red-200",
              ])}
            >
              <XCircleIcon size={16} />
              <span>
                {importMutation.isError
                  ? `Import failed: ${importMutation.error.message}`
                  : `Dry run failed: ${dryImportMutation.error?.message}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceItem({
  source,
  onDryRun,
  onConfirm,
  isConfirmMode,
  disabled,
}: {
  source: ImportSourceInfo;
  onDryRun: (source: ImportSourceKind) => void;
  onConfirm: (source: ImportSourceKind) => void;
  isConfirmMode: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white border">
      <div className="flex flex-col">
        <span className="font-medium text-sm">{source.name}</span>
        <span className="text-xs text-neutral-500">{source.description}</span>
      </div>
      <Button
        size="sm"
        variant={isConfirmMode ? "default" : "outline"}
        onClick={() =>
          isConfirmMode ? onConfirm(source.kind) : onDryRun(source.kind)
        }
        disabled={disabled}
      >
        {isConfirmMode ? "Confirm" : "Import"}
      </Button>
    </div>
  );
}
