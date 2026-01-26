import { useQuery } from "@tanstack/react-query";
import { FolderIcon } from "lucide-react";

import { commands as settingsCommands } from "@hypr/plugin-settings";

export function StorageSettingsView() {
  const { data: globalBase } = useQuery({
    queryKey: ["global-base-path"],
    queryFn: async () => {
      const result = await settingsCommands.globalBase();
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const { data: vaultBase } = useQuery({
    queryKey: ["vault-base-path"],
    queryFn: async () => {
      const result = await settingsCommands.vaultBase();
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  return (
    <div>
      <h2 className="font-semibold font-serif mb-4">Storage</h2>
      <div className="flex flex-col gap-4">
        <StoragePathRow
          title="Global"
          description="Stores app-wide settings and configurations"
          path={globalBase}
        />
        <StoragePathRow
          title="Vault"
          description="Stores your notes, recordings, and session data"
          path={vaultBase}
        />
      </div>
    </div>
  );
}

function StoragePathRow({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-1">{title}</h3>
        <p className="text-xs text-neutral-600">{description}</p>
      </div>
      <div className="flex items-center gap-3 border border-neutral-200 rounded-lg px-4 py-2">
        <FolderIcon className="size-4 text-neutral-500 shrink-0" />
        <span className="text-sm text-neutral-600 truncate">
          {path ?? "Loading..."}
        </span>
      </div>
    </div>
  );
}
