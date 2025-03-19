import { AnimatePresence, LayoutGroup } from "motion/react";
import EventsList from "./events-list";
import NotesList from "./notes-list";

export default function AllList() {
  return (
    <div className="h-full space-y-4 px-3 pb-4">
      <EventsList />

      <LayoutGroup>
        <AnimatePresence initial={false}>
          <NotesList />
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}
