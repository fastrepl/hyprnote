import { useQuery } from "@tanstack/react-query";
import { LinkProps } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { useHypr, useRightPanel } from "@/contexts";
import { type ExtensionName } from "@hypr/extension-registry";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as windowsCommands, getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import WidgetRenderer from "./renderer";

export default function RightPanel() {
  const [isMobile, setIsMobile] = useState(false);
  const { isExpanded, hidePanel } = useRightPanel();
  const { userId } = useHypr();

  const show = getCurrentWebviewWindowLabel() === "main" && isExpanded;

  const extensions = useQuery({
    queryKey: ["extensions"],
    queryFn: () => dbCommands.listExtensionMappings(userId),
  });

  const widgets = useMemo(() => {
    return (extensions.data?.flatMap((extension) => {
      return extension.widgets.map((widget) => ({
        extensionName: extension.extension_id as ExtensionName,
        groupName: widget.group,
        widgetType: widget.kind,
        layout: widget.position,
      }));
    }) ?? []);
  }, [extensions.data]);

  const handleClickConfigureWidgets = () => {
    const params = {
      to: "/app/settings",
      search: { current: "extensions" },
    } as const satisfies LinkProps;

    const url = `${params.to}?current=${params.search.current}`;

    windowsCommands.windowShow("settings").then(() => {
      setTimeout(() => {
        windowsCommands.windowEmitNavigate("settings", url);
      }, 200);
    });
  };

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 760);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);

    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  if (isMobile) {
    return (
      <div className="relative h-full">
        {show && (
          <div
            className="absolute inset-0 bg-black/30 z-40"
            onClick={hidePanel}
          />
        )}

        <motion.div
          initial={false}
          animate={{ x: show ? 0 : "100%" }}
          transition={{ duration: 0.3 }}
          className="absolute right-0 top-0 z-40 h-full w-[380px] overflow-y-auto border-l bg-neutral-50 scrollbar-none shadow-lg"
        >
          <WidgetRenderer widgets={widgets} />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={false}
      animate={{ width: show ? 380 : 0 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-y-auto border-l bg-neutral-50 scrollbar-none relative"
    >
      <WidgetRenderer widgets={widgets} />
      {widgets.length > 0
        ? (
          <button
            onClick={handleClickConfigureWidgets}
            className="absolute bottom-0 w-full p-2 text-center hover:bg-neutral-100"
          >
            Configure Widgets
          </button>
        )
        : (
          <div className="flex h-full w-full items-center justify-center">
            <button
              onClick={handleClickConfigureWidgets}
              className="aspect-square w-3/4 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xl"
            >
              Configure Widgets
            </button>
          </div>
        )}
    </motion.div>
  );
}
