import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { useHypr } from "@/contexts";
import { EXTENSION_CONFIGS, type ExtensionName, importExtension } from "@hypr/extension-registry";
import { commands as dbCommands, type ExtensionDefinition, ExtensionWidgetKind } from "@hypr/plugin-db";
import { WidgetOneByOneWrapper, WidgetTwoByOneWrapper, WidgetTwoByTwoWrapper } from "@hypr/ui/components/ui/widgets";

interface ExtensionsComponentProps {
  selectedExtension: ExtensionDefinition | null;
  onExtensionSelect: (extension: ExtensionDefinition | null) => void;
}

type ExtensionData = {
  id: string;
  groups: {
    id: string;
    types: string[];
  }[];
};

export default function Extensions({ selectedExtension, onExtensionSelect }: ExtensionsComponentProps) {
  const { userId } = useHypr();

  const [extensionData, setExtensionData] = useState<ExtensionData | null>(null);

  useEffect(() => {
    if (selectedExtension?.id) {
      importExtension(selectedExtension.id as ExtensionName).then((module) => {
        const data: ExtensionData = {
          id: selectedExtension.id,
          groups: module.default.widgetGroups.map((group) => ({
            id: group.id,
            types: group.items.map((item) => item.type),
          })),
        };
        setExtensionData(data);
      });
    }
  }, [selectedExtension]);

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

  const implementedExtensions = useMemo(() => EXTENSION_CONFIGS.filter((ext) => ext.implemented), []);

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
        {extensionData?.groups.map((group) => <RenderGroup key={group.id} group={group} />)}
      </div>
    </div>
  );
}

function RenderGroup({ group }: { group: ExtensionData["groups"][number] }) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-lg font-semibold text-neutral-700 mb-2">{group.id}</h4>
      <div>
        {group.types.map((type: Omit<ExtensionWidgetKind, "full">) => (
          <div key={type as string}>
            {type === "oneByOne" && (
              <WidgetOneByOneWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 1×1</div>
              </WidgetOneByOneWrapper>
            )}
            {type === "twoByOne" && (
              <WidgetTwoByOneWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 2×1</div>
              </WidgetTwoByOneWrapper>
            )}
            {type === "twoByTwo" && (
              <WidgetTwoByTwoWrapper>
                <div className="flex items-center justify-center h-full text-neutral-600">Example 2×2</div>
              </WidgetTwoByTwoWrapper>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
