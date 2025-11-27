import { createFileRoute } from "@tanstack/react-router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { type ComponentType, useEffect, useRef, useState } from "react";
import { createMergeableStore } from "tinybase";
import { Provider as TinyBaseProvider } from "tinybase/ui-react";

import { initExtensionGlobals } from "../../extension-globals";
import { createParentSynchronizer } from "../../store/tinybase/iframe-sync";
import type { ExtensionViewProps } from "../../types/extensions";

export const Route = createFileRoute("/app/ext-host")({
  validateSearch: (search: Record<string, unknown>) => ({
    extensionId: search.extensionId as string,
    entryPath: search.entryPath as string,
  }),
  component: ExtHostComponent,
});

function ExtHostComponent() {
  const { extensionId, entryPath } = Route.useSearch();
  const [Component, setComponent] =
    useState<ComponentType<ExtensionViewProps> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const storeRef = useRef<ReturnType<typeof createMergeableStore> | null>(null);
  const synchronizerRef = useRef<ReturnType<
    typeof createParentSynchronizer
  > | null>(null);

  useEffect(() => {
    initExtensionGlobals();

    const store = createMergeableStore();
    storeRef.current = store;

    const synchronizer = createParentSynchronizer(store);
    synchronizerRef.current = synchronizer;

    synchronizer.startSync().then(() => {
      loadExtensionScript();
    });

    return () => {
      synchronizer.destroy();
    };
  }, []);

  const loadExtensionScript = async () => {
    if (!entryPath) {
      setError("No entry path provided");
      return;
    }

    try {
      const scriptUrl = convertFileSrc(entryPath);
      const response = await fetch(scriptUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch extension script: ${response.status}`);
      }

      const scriptContent = await response.text();

      const previousExports = (
        window as Window & { __hypr_panel_exports?: unknown }
      ).__hypr_panel_exports;

      const script = document.createElement("script");
      script.textContent = scriptContent;
      document.head.appendChild(script);
      document.head.removeChild(script);

      const exports = (
        window as Window & {
          __hypr_panel_exports?: {
            default?: ComponentType<ExtensionViewProps>;
          };
        }
      ).__hypr_panel_exports;

      if (exports?.default) {
        setComponent(() => exports.default!);
        (
          window as Window & { __hypr_panel_exports?: unknown }
        ).__hypr_panel_exports = previousExports;
      } else {
        setError("Extension did not export a default component");
      }
    } catch (err) {
      setError(
        `Failed to load extension: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center text-red-500">
          <p className="font-semibold">Error loading extension</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!Component || !storeRef.current) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-neutral-500">
          <p>Loading extension...</p>
        </div>
      </div>
    );
  }

  return (
    <TinyBaseProvider store={storeRef.current}>
      <Component extensionId={extensionId} />
    </TinyBaseProvider>
  );
}
