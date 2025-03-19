import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PlugIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useHypr } from "@/contexts";
import { commands as dbCommands, type ExtensionDefinition } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { WidgetOneByOneWrapper, WidgetTwoByOneWrapper, WidgetTwoByTwoWrapper } from "@hypr/ui/components/ui/widgets";
import { EXTENSION_CONFIGS } from "../sidebar/extensions-view";

interface ExtensionsComponentProps {
  selectedExtension: ExtensionDefinition | null;
  onExtensionSelect: (extension: ExtensionDefinition | null) => void;
}

export default function Extensions({ selectedExtension, onExtensionSelect }: ExtensionsComponentProps) {
  const { userId } = useHypr();

  const extension = useQuery({
    enabled: !!selectedExtension?.id,
    queryKey: ["extension-mapping", selectedExtension?.id],
    queryFn: async () => {
      const extensionMapping = await dbCommands.getExtensionMapping(userId, selectedExtension?.id!);
      return extensionMapping;
    },
  });

  useMutation({
    mutationFn: async () => {
      if (!extension.data) {
        return;
      }

      await dbCommands.upsertExtensionMapping(extension.data);
    },
  });

  const implementedExtensions = useMemo(() => EXTENSION_CONFIGS.filter(ext => ext.implemented), []);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!selectedExtension && implementedExtensions.length > 0) {
      onExtensionSelect(implementedExtensions[0]);
      return;
    }

    if (selectedExtension && !selectedExtension.implemented && implementedExtensions.length > 0) {
      onExtensionSelect(implementedExtensions[0]);
    }
  }, [selectedExtension, onExtensionSelect, implementedExtensions]);

  if (!selectedExtension) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4 text-neutral-700">Extensions</h2>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
          <p className="text-neutral-500">
            <Trans>Loading extension details...</Trans>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b pb-4 border-border">
        <h3 className="text-2xl font-semibold text-neutral-700 mb-2">{selectedExtension.title}</h3>

        {/* TODO */}
        <button className="p-2 bg-neutral-500 hover:bg-neutral-600 text-neutral-100 rounded-md">
          upsert
        </button>

        <p className="text-neutral-600 mb-4">{selectedExtension.description}</p>

        <div className="flex flex-wrap gap-0.5">
          {selectedExtension.tags.length > 0
            ? (
              selectedExtension.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-neutral-50 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200 mr-1 mb-1"
                >
                  {tag}
                </span>
              ))
            )
            : (
              <span className="text-xs text-neutral-500 px-1.5 py-0.5 rounded border border-dashed border-neutral-300">
                <Trans>no tags</Trans>
              </span>
            )}
        </div>
      </div>

      {/* TODO: Fetch widgets and display */}

      {selectedExtension.cloud_only && !isConnected
        ? (
          <div className="w-full">
            <div className="text-neutral-700 font-medium mb-3">Translation</div>

            <div className="flex flex-col gap-3">
              <WidgetOneByOneWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Translate 1×1</div>
              </WidgetOneByOneWrapper>
              <WidgetTwoByOneWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 2×1</div>
              </WidgetTwoByOneWrapper>
              <WidgetTwoByTwoWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 2×2</div>
              </WidgetTwoByTwoWrapper>
            </div>
          </div>
        )
        : (
          selectedExtension.cloud_only && (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200 flex flex-col backdrop-blur-sm">
              <Button
                onClick={() => {
                  setIsConnected(true);
                }}
                className="bg-neutral-700 text-neutral-100 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <PlugIcon className="h-4 w-4 mr-2" />
                Connect to {selectedExtension.title}
              </Button>
            </div>
          )
        )}

      {!selectedExtension.cloud_only && (
        <>
          <div className="space-y-4">
            <h4 className="text-neutral-700 font-medium text-lg">Default</h4>
            <p className="text-neutral-600">
              Shows a live caption of the conversation. After the meeting is over, the widget will show the full
              transcript of the meeting.
            </p>

            <div className="flex flex-col gap-3">
              <WidgetOneByOneWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 1×1</div>
              </WidgetOneByOneWrapper>
              <WidgetTwoByOneWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 2×1</div>
              </WidgetTwoByOneWrapper>
              <WidgetTwoByTwoWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 2×2</div>
              </WidgetTwoByTwoWrapper>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-neutral-700 font-medium text-lg">Translation</h4>
            <p className="text-neutral-600">
              Shows a live caption of the conversation in your desired language. After the meeting is over, the widget
              will show the full conversation content of the meeting.
            </p>

            <div className="flex flex-col gap-3">
              <WidgetOneByOneWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 1×1</div>
              </WidgetOneByOneWrapper>
              <WidgetTwoByOneWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 2×1</div>
              </WidgetTwoByOneWrapper>
              <WidgetTwoByTwoWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 2×2</div>
              </WidgetTwoByTwoWrapper>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-neutral-700 font-medium text-lg">Checkpoints</h4>
            <p className="text-neutral-600">
              You can mark important moments in the conversation and save them as checkpoints, with all the above
              features.
            </p>

            <div className="flex flex-col gap-3">
              <WidgetOneByOneWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 1×1</div>
              </WidgetOneByOneWrapper>
              <WidgetTwoByOneWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 2×1</div>
              </WidgetTwoByOneWrapper>
              <WidgetTwoByTwoWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 2×2</div>
              </WidgetTwoByTwoWrapper>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
