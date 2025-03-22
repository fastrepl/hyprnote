import { useMatch } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { useHypr, useRightPanel } from "@/contexts";
import { useQuery } from "@tanstack/react-query";
import WidgetRenderer from "./renderer";

import { commands as dbCommands } from "@hypr/plugin-db";
import { ExtensionName } from "./renderer/extensions";

export default function RightPanel() {
  const [isMobile, setIsMobile] = useState(false);
  const { isExpanded, hidePanel } = useRightPanel();

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const show = noteMatch?.search.window === "main" && isExpanded;

  const { userId } = useHypr();

  const extensions = useQuery({
    queryKey: ["extensions", userId],
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

  // const widgets: WidgetConfig[] = [
  //   {
  //     extensionName: "@hypr/extension-dino-game",
  //     groupName: "chromeDino",
  //     widgetType: "twoByOne",
  //     layout: { x: 0, y: 0 },
  //   },
  //   {
  //     extensionName: "@hypr/extension-summary",
  //     groupName: "bullet",
  //     widgetType: "twoByTwo",
  //     layout: { x: 0, y: 1 },
  //   },
  //   {
  //     extensionName: "@hypr/extension-transcript",
  //     groupName: "default",
  //     widgetType: "twoByTwo",
  //     layout: { x: 0, y: 3 },
  //   },
  // ];

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
      className="h-full overflow-y-auto border-l bg-neutral-50 scrollbar-none"
    >
      <WidgetRenderer widgets={widgets} />
    </motion.div>
  );
}
