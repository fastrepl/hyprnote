import { motion } from "motion/react";

import { useRightPanel } from "@/contexts";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { ChatView, TranscriptView } from "./views";

export default function RightPanel() {
  const { isExpanded, currentView } = useRightPanel();
  const show = getCurrentWebviewWindowLabel() === "main" && isExpanded;

  return (
    <motion.div
      initial={false}
      animate={{ width: show ? 380 : 0 }}
      transition={{ duration: 0.14 }}
      className="h-full border-l bg-neutral-50 overflow-hidden"
    >
      {(currentView === "transcript") ? <TranscriptView /> : <ChatView />}
    </motion.div>
  );
}
