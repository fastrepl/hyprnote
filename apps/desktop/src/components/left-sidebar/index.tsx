import { useMatch } from "@tanstack/react-router";
import { motion } from "motion/react";

import { useLeftSidebar } from "@/contexts";
import SettingsButton from "../settings-panel";
import { LeftSidebarButton } from "../toolbar/buttons/left-sidebar-button";
import NotesList from "./notes-list";
import UpdateButton from "./update-button";

export default function LeftSidebar() {
  const { isExpanded } = useLeftSidebar();
  const match = useMatch({ from: "/app/note/$id/main", shouldThrow: false });

  const show = match !== undefined && isExpanded;

  return (
    <motion.div
      layout
      initial={{ width: show ? 240 : 0, opacity: show ? 1 : 0 }}
      animate={{ width: show ? 240 : 0, opacity: show ? 1 : 0 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col overflow-hidden border-r bg-neutral-50"
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

      <div className="flex items-center p-2 border-t">
        <SettingsButton />
      </div>
    </motion.div>
  );
}
