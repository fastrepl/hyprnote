import { motion } from "motion/react";
import { useLeftSidebar } from "@/contexts/left-sidebar";
import NotesList from "./notes-list";

export default function LeftSidebar() {
  const { isExpanded } = useLeftSidebar();

  return (
    <motion.div
      layout
      initial={{ width: 0 }}
      animate={{ width: isExpanded ? 240 : 0 }}
      className="h-full overflow-y-auto border-r bg-neutral-50"
    >
      <NotesList />
    </motion.div>
  );
}
