import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Building2Icon,
  CheckCircleIcon,
  FileTextIcon,
  Loader2Icon,
  MicIcon,
  UserIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react";
import { useState } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import {
  commands,
  type ImportSourceInfo,
  type ImportSourceKind,
  type ImportStats,
} from "@hypr/plugin-importer";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { importFromJson } from "../../../store/tinybase/store/importer";
import * as main from "../../../store/tinybase/store/main";
import { save } from "../../../store/tinybase/store/save";

type DryRunResult = {
  source: ImportSourceKind;
  stats: ImportStats;
};

export function Import() {
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const store = main.UI.useStore(main.STORE_ID);
  const { user_id } = main.UI.useValues(main.STORE_ID);

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
      const result = await commands.runImport(source, user_id ?? "");
      if (result.status === "error") {
        throw new Error(result.error);
      }

      if (!store) {
        throw new Error("Store not available");
      }

      const importResult = await importFromJson(store as main.Store, save);
      if (importResult.status === "error") {
        throw new Error(importResult.error);
      }

      return result.data;
    },
    onSuccess: () => {
      void analyticsCommands.event({
        event: "data_imported",
        source: dryRunResult?.source,
      });
      setDryRunResult(null);
    },
  });

  const dryImportMutation = useMutation({
    mutationFn: async (source: ImportSourceKind) => {
      const result = await commands.runImportDry(source);
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return { source, stats: result.data };
    },
    onSuccess: (result) => {
      setDryRunResult(result);
    },
  });

  const handleCancel = () => {
    setDryRunResult(null);
    dryImportMutation.reset();
    importMutation.reset();
  };

  const isPending = importMutation.isPending || dryImportMutation.isPending;

  return (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col gap-3">
        <h3 className="text-md font-semibold">Import Data</h3>
        <p className="text-sm text-neutral-600">
          Import data from other sources into Hyprnote.
        </p>

        <div className="flex flex-col gap-4 p-4 rounded-xl border bg-neutral-50">
          {dryRunResult ? (
            <ImportPreview
              stats={dryRunResult.stats}
              sourceName={
                sources?.find((s) => s.kind === dryRunResult.source)?.name ??
                "Unknown"
              }
              onConfirm={() => importMutation.mutate(dryRunResult.source)}
              onCancel={handleCancel}
              isPending={importMutation.isPending}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {sources?.map((source: ImportSourceInfo) => (
                <SourceItem
                  key={source.kind}
                  source={source}
                  onScan={() => dryImportMutation.mutate(source.kind)}
                  disabled={isPending}
                  isScanning={
                    dryImportMutation.isPending &&
                    dryImportMutation.variables === source.kind
                  }
                />
              ))}
            </div>
          )}

          {dryImportMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Loader2Icon size={16} className="animate-spin" />
              <span>Scanning for data...</span>
            </div>
          )}

          {importMutation.isSuccess && (
            <div
              className={cn([
                "flex items-center gap-2 text-sm text-green-600",
                "p-3 rounded-lg bg-green-50 border border-green-200",
              ])}
            >
              <CheckCircleIcon size={16} />
              <span>Import completed successfully.</span>
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
                  : `Scan failed: ${dryImportMutation.error?.message}`}
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
  onScan,
  disabled,
  isScanning,
}: {
  source: ImportSourceInfo;
  onScan: () => void;
  disabled: boolean;
  isScanning: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white border">
      <div className="flex flex-col">
        <span className="font-medium text-sm">{source.name}</span>
        <span className="text-xs text-neutral-500">{source.description}</span>
      </div>
      <Button size="sm" variant="outline" onClick={onScan} disabled={disabled}>
        {isScanning ? (
          <>
            <Loader2Icon size={14} className="animate-spin mr-1" />
            Scanning...
          </>
        ) : (
          "Scan"
        )}
      </Button>
    </div>
  );
}

function ImportPreview({
  stats,
  sourceName,
  onConfirm,
  onCancel,
  isPending,
}: {
  stats: ImportStats;
  sourceName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const totalItems =
    stats.notes_count +
    stats.transcripts_count +
    stats.humans_count +
    stats.organizations_count;

  const hasData = totalItems > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h4 className="font-medium text-sm">Import Preview</h4>
        <p className="text-xs text-neutral-500">
          Found the following data from {sourceName}:
        </p>
      </div>

      {hasData ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={FileTextIcon}
              label="Notes"
              count={stats.notes_count}
            />
            <StatCard
              icon={MicIcon}
              label="Transcripts"
              count={stats.transcripts_count}
            />
            <StatCard
              icon={UserIcon}
              label="People"
              count={stats.humans_count}
            />
            <StatCard
              icon={Building2Icon}
              label="Organizations"
              count={stats.organizations_count}
            />
            {stats.participants_count > 0 && (
              <StatCard
                icon={UsersIcon}
                label="Participants"
                count={stats.participants_count}
              />
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={onConfirm} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon size={14} className="animate-spin mr-1" />
                  Importing...
                </>
              ) : (
                `Import ${totalItems} items`
              )}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 py-4 text-neutral-500">
          <p className="text-sm">No data found to import.</p>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Back
          </Button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  count: number;
}) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white border">
      <div className="p-2 rounded-md bg-neutral-100">
        <Icon size={16} className="text-neutral-600" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-semibold">{count}</span>
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
    </div>
  );
}
