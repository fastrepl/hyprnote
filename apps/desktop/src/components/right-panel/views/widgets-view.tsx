import { useMutation, useQuery } from "@tanstack/react-query";
import { LinkProps, useMatch } from "@tanstack/react-router";
import { useMemo } from "react";
import type { Layout } from "react-grid-layout";

import { useHypr } from "@/contexts";
import { type ExtensionName } from "@hypr/extension-registry";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import WidgetRenderer from "../components/widget-renderer";
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

        const extension = extensions.data?.find(ext =>
          ext.extension_id === extensionName
          && ext.widgets.some(w => w.group === groupName && w.kind === widgetType)
        );

        if (!extension) {
          return null;
        }

        const updatedWidgets = extension.widgets.map(widget =>
          (widget.group === groupName && widget.kind === widgetType)
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

  const handleClickConfigureWidgets = () => {
    const params = {
      to: "/app/settings",
      search: { current: "extensions" },
    } as const satisfies LinkProps;

    const url = `${params.to}?current=${params.search.current}`;

    windowsCommands.windowShow({ type: "settings" }).then(() => {
      setTimeout(() => {
        windowsCommands.windowEmitNavigate({ type: "settings" }, url);
      }, 500);
    });
  };

  if (!noteMatch) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-neutral-500">Widgets are only available in note view.</div>
      </div>
    );
  }

  const { params: { id: sessionId } } = noteMatch;

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
        <button
          onClick={handleClickConfigureWidgets}
          className="px-2 py-1.5 text-xs rounded-full bg-white hover:bg-neutral-200 border border-border transition-all shadow-md hover:shadow-sm transform hover:translate-y-0.5 active:translate-y-1 active:shadow-none"
        >
          Configure Widgets
        </button>
      </div>
    );
}
