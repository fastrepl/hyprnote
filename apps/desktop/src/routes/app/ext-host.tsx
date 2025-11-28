import { createFileRoute } from "@tanstack/react-router";
import { type ComponentType, useEffect, useRef, useState } from "react";
import { createMergeableStore } from "tinybase";
import { Provider as TinyBaseProvider } from "tinybase/ui-react";

import { initExtensionGlobals } from "../../extension-globals";
import { createParentSynchronizer } from "../../store/tinybase/iframe-sync";
import type { ExtensionViewProps } from "../../types/extensions";

type ExtHostSearch = {
  extensionId?: string;
  scriptUrl?: string;
  stylesUrl?: string;
};

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "javascript:") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/app/ext-host")({
  validateSearch: (search: Record<string, unknown>): ExtHostSearch => {
    const result: ExtHostSearch = {};

    const extensionId = search.extensionId;
    if (typeof extensionId === "string" && extensionId.trim().length > 0) {
      result.extensionId = extensionId;
    }

    const scriptUrl = search.scriptUrl;
    if (
      typeof scriptUrl === "string" &&
      scriptUrl.trim().length > 0 &&
      isValidUrl(scriptUrl)
    ) {
      result.scriptUrl = scriptUrl;
    }

    const stylesUrl = search.stylesUrl;
    if (
      typeof stylesUrl === "string" &&
      stylesUrl.trim().length > 0 &&
      isValidUrl(stylesUrl)
    ) {
      result.stylesUrl = stylesUrl;
    }

    return result;
  },
  component: ExtHostComponent,
});

function ExtHostComponent() {
  const { extensionId, scriptUrl, stylesUrl } = Route.useSearch();
  const [Component, setComponent] =
    useState<ComponentType<ExtensionViewProps> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const storeRef = useRef<ReturnType<typeof createMergeableStore> | null>(null);
  const synchronizerRef = useRef<ReturnType<
    typeof createParentSynchronizer
  > | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    initExtensionGlobals();

    if (stylesUrl) {
      loadExtensionStyles();
    }

    const store = createMergeableStore();
    storeRef.current = store;

    const synchronizer = createParentSynchronizer(store);
    synchronizerRef.current = synchronizer;

    synchronizer
      .startSync()
      .then(() => {
        if (isMountedRef.current) {
          loadExtensionScript();
        }
      })
      .catch((err) => {
        console.error("[ext-host] Failed to start sync:", err);
        if (isMountedRef.current) {
          setError(
            `Failed to sync with parent: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      });

    return () => {
      isMountedRef.current = false;
      synchronizer.destroy();
    };
  }, []);

  const loadExtensionStyles = async () => {
    if (!stylesUrl) return;

    try {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = stylesUrl;
      link.dataset.extensionStyles = extensionId || "unknown";
      document.head.appendChild(link);
    } catch (err) {
      console.error("[ext-host] Failed to load extension styles:", err);
    }
  };

  const loadExtensionScript = async () => {
    if (!scriptUrl) {
      if (isMountedRef.current) {
        setError("No script URL provided");
      }
      return;
    }

    try {
      const response = await fetch(scriptUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch extension script: ${response.status}`);
      }

      const contentType =
        response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("javascript")) {
        throw new Error(
          `Invalid content-type for extension script: expected JavaScript, got ${contentType || "unknown"}`,
        );
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
        if (isMountedRef.current) {
          setComponent(() => exports.default!);
          (
            window as Window & { __hypr_panel_exports?: unknown }
          ).__hypr_panel_exports = previousExports;
        }
      } else {
        if (isMountedRef.current) {
          setError("Extension did not export a default component");
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(
          `Failed to load extension: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  };

  if (!extensionId) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center text-red-500">
          <p className="font-semibold">Error loading extension</p>
          <p className="text-sm mt-2">Missing or invalid extension ID</p>
        </div>
      </div>
    );
  }

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
