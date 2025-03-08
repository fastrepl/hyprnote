import { motion } from "motion/react";
import { useLeftSidebar } from "@/contexts/left-sidebar";
import NotesList from "./notes-list";
import { LeftSidebarButton } from "./toolbar/buttons/left-sidebar-button";

export default function LeftSidebar() {
  const { isExpanded } = useLeftSidebar();

  return (
    <motion.div
      layout
      initial={{ width: isExpanded ? 240 : 0 }}
      animate={{ width: isExpanded ? 240 : 0 }}
      className="h-full flex flex-col overflow-hidden border-r bg-neutral-100 dark:bg-neutral-700 dark:border-neutral-800"
    >
      <div className="flex items-center justify-end min-h-11 px-2">
        <LeftSidebarButton type="sidebar" />
      </div>

      <div className="flex-1 h-full overflow-y-auto">
        <NotesList />
      </div>
    </motion.div>
  );
}
