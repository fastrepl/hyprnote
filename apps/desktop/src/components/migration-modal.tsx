import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Database, FileText, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  commands as importerCommands,
  type ImportSourceInfo,
  type ImportSourceKind,
  type ImportStats,
} from "@hypr/plugin-importer";
import { Button } from "@hypr/ui/components/ui/button";
import { Modal } from "@hypr/ui/components/ui/modal";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/utils";

import { importFromJson } from "../store/tinybase/store/importer";
import * as main from "../store/tinybase/store/main";
import { save } from "../store/tinybase/store/save";
import { commands } from "../types/tauri.gen";

export function MigrationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [selectedSource, setSelectedSource] = useState<{
    kind: ImportSourceKind;
    name: string;
  } | null>(null);
  const store = main.UI.useStore(main.STORE_ID);
  const { user_id } = main.UI.useValues(main.STORE_ID);

  const { data: sources } = useQuery({
    queryKey: ["migration-sources"],
    queryFn: async () => {
      const result = await importerCommands.listAvailableSources();
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data.filter(
        (s): s is ImportSourceInfo & { kind: ImportSourceKind } =>
          s.kind !== null &&
          (s.kind === "hyprnote_v0_stable" || s.kind === "hyprnote_v0_nightly"),
      );
    },
  });

  useEffect(() => {
    const checkMigrationNeeded = async () => {
      const dismissedResult = await commands.getMigrationDismissed();
      if (dismissedResult.status === "error" || dismissedResult.data) {
        return;
      }

      if (sources && sources.length > 0) {
        const source = sources[0];
        setSelectedSource({ kind: source.kind, name: source.name });

        const dryResult = await importerCommands.runImportDry(source.kind);
        if (dryResult.status === "ok" && dryResult.data.notesCount > 0) {
          setStats(dryResult.data);
          setIsOpen(true);
        }
      }
    };

    if (sources !== undefined) {
      checkMigrationNeeded();
    }
  }, [sources]);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSource || !store) {
        throw new Error("No source selected or store not available");
      }

      const result = await importerCommands.runImport(
        selectedSource.kind,
        user_id ?? "",
      );
      if (result.status === "error") {
        throw new Error(result.error);
      }

      const importResult = await importFromJson(store as main.Store, save);
      if (importResult.status === "error") {
        throw new Error(importResult.error);
      }

      return result.data;
    },
    onSuccess: async () => {
      await commands.setMigrationDismissed(true);
      setIsOpen(false);
    },
  });

  const handleDismiss = async () => {
    await commands.setMigrationDismissed(true);
    setIsOpen(false);
  };

  const handleMigrate = () => {
    importMutation.mutate();
  };

  if (!stats || !selectedSource) {
    return null;
  }

  const totalItems =
    stats.notesCount +
    stats.transcriptsCount +
    stats.humansCount +
    stats.organizationsCount;

  return (
    <Modal open={isOpen} onClose={handleDismiss} size="lg">
      <div className="relative flex flex-col">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-6 p-6 text-center">
          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-2xl font-semibold">
              Import your existing notes
            </h2>
            <p className="text-muted-foreground text-sm">
              We found notes from a previous version of Hyprnote.
              <br />
              Would you like to import them?
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 max-w-md">
            {stats.notesCount > 0 && (
              <StatBadge
                icon={FileText}
                label={`${stats.notesCount} note${stats.notesCount !== 1 ? "s" : ""}`}
              />
            )}
            {stats.transcriptsCount > 0 && (
              <StatBadge
                icon={Database}
                label={`${stats.transcriptsCount} transcript${stats.transcriptsCount !== 1 ? "s" : ""}`}
              />
            )}
            {stats.humansCount > 0 && (
              <StatBadge
                icon={Users}
                label={`${stats.humansCount} contact${stats.humansCount !== 1 ? "s" : ""}`}
              />
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            From: {selectedSource.name}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleDismiss}
              disabled={importMutation.isPending}
            >
              Skip for now
            </Button>
            <Button
              onClick={handleMigrate}
              disabled={importMutation.isPending || totalItems === 0}
              className="gap-2"
            >
              {importMutation.isPending ? (
                <>
                  <Spinner size={16} />
                  Importing...
                </>
              ) : (
                <>
                  Import notes
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {importMutation.isError && (
            <p className="text-xs text-red-600">
              Import failed: {importMutation.error.message}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function StatBadge({
  icon: Icon,
  label,
}: {
  icon: typeof FileText;
  label: string;
}) {
  return (
    <div
      className={cn([
        "rounded-full border border-border bg-secondary/50 px-4 py-2 text-[12px] text-secondary-foreground",
        "flex items-center gap-2",
      ])}
    >
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}
