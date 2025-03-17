import { motion } from "motion/react";
import { NoteItem } from "./note-item";

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
      >
        <NoteItem
          sessionId={sessionId}
        />
      </motion.div>
      <hr />
    </>
  );
}
