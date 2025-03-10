import { clsx } from "clsx";
import { motion } from "motion/react";

import { check } from "@tauri-apps/plugin-updater";
import { ask } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

import { useLeftSidebar } from "@/contexts/left-sidebar";
import NotesList from "./notes-list";
import { LeftSidebarButton } from "./toolbar/buttons/left-sidebar-button";
import { useQuery } from "@tanstack/react-query";

export default function LeftSidebar() {
  const { isExpanded } = useLeftSidebar();

  return (
    <motion.div
      layout
      initial={{ width: isExpanded ? 240 : 0 }}
      animate={{ width: isExpanded ? 240 : 0 }}
      className="h-full flex flex-col overflow-hidden border-r bg-neutral-100 dark:bg-neutral-700 dark:border-neutral-800"
    >
      <div
        className="flex items-center justify-end min-h-11 px-2"
        data-tauri-drag-region
      >
        <LeftSidebarButton type="sidebar" />
      </div>

      <div className="flex-1 h-full overflow-y-auto">
        <NotesList />
      </div>

      <UpdateButton />
    </motion.div>
  );
}

function UpdateButton() {
  const checkForUpdate = useQuery({
    enabled: process.env.NODE_ENV === "production",
    queryKey: ["check-for-update"],
    queryFn: () => check(),
    refetchInterval: 1000 * 60,
  });

  if (!checkForUpdate.data?.available) {
    return null;
  }

  const handleClick = async () => {
    const update = checkForUpdate.data;
    if (!update) {
      return;
    }

    const yes = await ask(
      `
  Update to ${update.version} is available!
  Release notes: ${update.body}
          `,
      {
        title: "Update Now!",
        kind: "info",
        okLabel: "Update",
        cancelLabel: "Cancel",
      },
    );

    if (yes) {
      await update.downloadAndInstall();
      await relaunch();
    }
  };

  return (
    <div className="flex items-center p-2">
      <button
        onClick={handleClick}
        className={clsx([
          "w-full px-2 py-1.5 rounded-md",
          "bg-neutral-200 dark:bg-neutral-800",
          "hover:bg-neutral-300 dark:hover:bg-neutral-600",
          "text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
        ])}
      >
        Update
      </button>
    </div>
  );
}
