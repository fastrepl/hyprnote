import type { ExtensionDefinition } from "@hypr/plugin-db";
import { CheckIcon, ChevronLeftIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { EXTENSION_CONFIGS } from "../sidebar/extensions-view";

interface ExtensionsComponentProps {
  selectedExtension: ExtensionDefinition | null;
  onExtensionSelect: (extension: ExtensionDefinition | null) => void;
}

export default function Extensions({ selectedExtension, onExtensionSelect }: ExtensionsComponentProps) {
  // Filter to only implemented extensions - memoize to prevent recalculation on every render
  const implementedExtensions = useMemo(() => EXTENSION_CONFIGS.filter(ext => ext.implemented), [] // EXTENSION_CONFIGS is imported and doesn't change during component lifecycle
  );

  // Combine the two useEffects into one to reduce render cycles
  useEffect(() => {
    // Case 1: No extension selected yet, select the first implemented one
    if (!selectedExtension && implementedExtensions.length > 0) {
      onExtensionSelect(implementedExtensions[0]);
      return;
    }

    // Case 2: Selected extension is not implemented, select the first implemented one
    if (selectedExtension && !selectedExtension.implemented && implementedExtensions.length > 0) {
      onExtensionSelect(implementedExtensions[0]);
    }
  }, [selectedExtension, onExtensionSelect, implementedExtensions]);

  // If no extension is selected yet and we're still loading, show a simple loading state
  if (!selectedExtension) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4 text-neutral-700">Extensions</h2>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
          <p className="text-neutral-500">Loading extension details...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-neutral-700">{selectedExtension.title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded flex items-center gap-1 bg-neutral-100 text-neutral-700 border border-neutral-200">
              <CheckIcon className="h-3 w-3" />
              <span>Installed</span>
            </span>
            <button
              onClick={() => onExtensionSelect(null)}
              className="text-xs px-2 py-1 rounded bg-neutral-100 text-neutral-700 hover:bg-neutral-200 focus:outline-none border border-neutral-200 flex items-center gap-1"
            >
              <ChevronLeftIcon className="h-3 w-3" />
              <span>Back to List</span>
            </button>
          </div>
        </div>

        <p className="text-neutral-600 mb-4">{selectedExtension.description}</p>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-neutral-500 mb-2">Details</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-neutral-500">ID</div>
            <div className="text-neutral-700">{selectedExtension.id}</div>

            <div className="text-neutral-500">Default</div>
            <div className="text-neutral-700">{selectedExtension.default ? "Yes" : "No"}</div>

            <div className="text-neutral-500">Cloud Only</div>
            <div className="text-neutral-700">{selectedExtension.cloud_only ? "Yes" : "No"}</div>
          </div>
        </div>

        {selectedExtension.plugins.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-neutral-500 mb-2">Required Plugins</h4>
            <ul className="list-disc list-inside text-sm text-neutral-600">
              {selectedExtension.plugins.map((plugin: string) => <li key={plugin}>{plugin}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
