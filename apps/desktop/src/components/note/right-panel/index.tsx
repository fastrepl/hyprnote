import { motion } from "motion/react";

import { useRightPanel } from "@/contexts/right-panel";
import WidgetRenderer from "./renderer";

export default function RightPanel() {
  const { isExpanded } = useRightPanel();

  return (
    <motion.div
      layout
      initial={{ width: 0 }}
      animate={{ width: isExpanded ? 380 : 0 }}
      className="h-full overflow-y-auto border-l bg-neutral-50 scrollbar-none"
    >
      <WidgetRenderer />
    </motion.div>
  );
}
