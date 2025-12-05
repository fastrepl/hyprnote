import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Loader2, Store, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { commands, type RegistryEntry } from "@hypr/plugin-extensions";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { listInstalledExtensions } from "./registry";

export function ExtensionStoreColumn({
  selectedExtension,
  setSelectedExtension,
}: {
  selectedExtension: string | null;
  setSelectedExtension: (id: string | null) => void;
}) {
  const queryClient = useQueryClient();

  const { data: registry, isLoading: isLoadingRegistry } = useQuery({
    queryKey: ["extensions", "registry"],
    queryFn: async () => {
      const result = await commands.fetchRegistry();
      if (result.status === "ok") {
        return result.data;
      }
      throw new Error(result.error as unknown as string);
    },
  });

  const { data: installedExtensions = [] } = useQuery({
    queryKey: ["extensions", "list"],
    queryFn: listInstalledExtensions,
  });

  const installedIds = useMemo(
    () => new Set(installedExtensions.map((ext) => ext.id)),
    [installedExtensions],
  );

  const installMutation = useMutation({
    mutationFn: async (entry: RegistryEntry) => {
      const result = await commands.downloadExtension(
        entry.id,
        entry.download_url,
        entry.checksum,
      );
      if (result.status === "error") {
        throw new Error(result.error as unknown as string);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extensions", "list"] });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      const result = await commands.uninstallExtension(extensionId);
      if (result.status === "error") {
        throw new Error(result.error as unknown as string);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extensions", "list"] });
    },
  });

  if (isLoadingRegistry) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!registry) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Store size={32} className="mx-auto mb-2 text-neutral-300" />
          <p className="text-sm text-neutral-500">
            Unable to load extension store
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="@container border-b border-neutral-200">
        <div className="py-2 pl-3 pr-1 flex items-center justify-between h-12 min-w-0">
          <h3 className="text-sm font-medium">Available Extensions</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {registry.extensions.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <Store size={32} className="mx-auto mb-2 text-neutral-300" />
              <p className="text-sm">No extensions available</p>
            </div>
          ) : (
            registry.extensions.map((entry) => (
              <StoreExtensionItem
                key={entry.id}
                entry={entry}
                isInstalled={installedIds.has(entry.id)}
                isSelected={selectedExtension === entry.id}
                isInstalling={
                  installMutation.isPending &&
                  installMutation.variables?.id === entry.id
                }
                isUninstalling={
                  uninstallMutation.isPending &&
                  uninstallMutation.variables === entry.id
                }
                onClick={() => setSelectedExtension(entry.id)}
                onInstall={() => installMutation.mutate(entry)}
                onUninstall={() => uninstallMutation.mutate(entry.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StoreExtensionItem({
  entry,
  isInstalled,
  isSelected,
  isInstalling,
  isUninstalling,
  onClick,
  onInstall,
  onUninstall,
}: {
  entry: RegistryEntry;
  isInstalled: boolean;
  isSelected: boolean;
  isInstalling: boolean;
  isUninstalling: boolean;
  onClick: () => void;
  onInstall: () => void;
  onUninstall: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInstalled) {
      onUninstall();
    } else {
      onInstall();
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn([
        "w-full text-left px-3 py-2 rounded-md text-sm border hover:bg-neutral-100 transition-colors cursor-pointer",
        isSelected ? "border-neutral-500 bg-neutral-100" : "border-transparent",
      ])}
    >
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 text-neutral-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-1">
            {entry.name}
            <span className="text-xs text-stone-400 font-mono">
              v{entry.version}
            </span>
            {isInstalled && (
              <Check className="h-3 w-3 text-green-500 shrink-0" />
            )}
          </div>
          {entry.description && (
            <div className="text-xs text-neutral-500 truncate">
              {entry.description}
            </div>
          )}
        </div>
        {(isHovered || isInstalling || isUninstalling) && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={handleAction}
            disabled={isInstalling || isUninstalling}
          >
            {isInstalling || isUninstalling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isInstalled ? (
              <Trash2 className="h-4 w-4 text-red-500" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
