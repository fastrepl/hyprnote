import { motion } from "motion/react";

import { NoteItem } from "./all-list/note-item";

export default function OngoingSession({ sessionId }: { sessionId: string }) {
  return (
    <>
      <motion.div
        key={sessionId}
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="px-3 pb-4 mb-4 border-b border-border"
      >
        <NoteItem
          currentSessionId={sessionId}
          activeSessionId={sessionId}
        />
      </motion.div>
    </>
  );
}
