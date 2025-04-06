import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { useMemo } from "react";
import type { Layout } from "react-grid-layout";

import { useHypr } from "@/contexts";
import { type ExtensionName } from "@hypr/extension-registry";
import { commands as dbCommands } from "@hypr/plugin-db";
import WidgetRenderer from "../components/widget-renderer";
import { ConfigureWidgetsButton } from "../components/widget-renderer/configure-widgets-button";
import { parseID } from "../components/widget-renderer/widgets";

export function WidgetsView() {
  const { userId } = useHypr();
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });

  const extensions = useQuery({
    queryKey: ["extensions"],
    queryFn: () => dbCommands.listExtensionMappings(userId),
  });

  const widgets = useMemo(() => {
    return extensions.data?.flatMap((extension) => {
      return extension.widgets.map((widget) => ({
        extensionName: extension.extension_id as ExtensionName,
        groupName: widget.group,
        widgetType: widget.kind,
        layout: widget.position,
      }));
    });
  }, [extensions.data]);

  const updateExtensions = useMutation({
    mutationFn: async (args: Pick<Layout, "i" | "x" | "y">[]) => {
      const updates = args.map(async (arg) => {
        const { extensionName, groupName, widgetType } = parseID(arg.i);

        const extension = extensions.data?.find(
          (ext) =>
            ext.extension_id === extensionName
            && ext.widgets.some(
              (w) => w.group === groupName && w.kind === widgetType,
            ),
        );

        if (!extension) {
          return null;
        }

        const updatedWidgets = extension.widgets.map((widget) =>
          widget.group === groupName && widget.kind === widgetType
            ? { ...widget, position: { x: arg.x, y: arg.y } }
            : widget
        );

        return dbCommands.upsertExtensionMapping({
          ...extension,
          widgets: updatedWidgets,
        });
      });

      return Promise.all(updates.filter(Boolean));
    },
    onSuccess: () => extensions.refetch(),
  });

  if (!noteMatch) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-neutral-500">
          Widgets are only available in note view.
        </div>
      </div>
    );
  }

  const {
    params: { id: sessionId },
  } = noteMatch;

  return widgets?.length
    ? (
      <WidgetRenderer
        key={sessionId}
        widgets={widgets}
        handleUpdateLayout={updateExtensions.mutate}
      />
    )
    : (
      <div className="flex items-center justify-center h-full">
        <ConfigureWidgetsButton>
          <Trans>Configure Widgets</Trans>
        </ConfigureWidgetsButton>
      </div>
    );
}
