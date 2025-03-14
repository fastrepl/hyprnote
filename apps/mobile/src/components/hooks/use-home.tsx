import { useFlow } from "@stackflow/react/future";
import { useState } from "react";
import { mockSessions } from "../../mock/home";

export function useHome() {
  const { push } = useFlow();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [notes] = useState(mockSessions);

  const groupedNotes = notes.reduce((acc, session) => {
    const date = new Date(session.created_at);
    const dateKey = date.toISOString().split("T")[0];

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }

    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, typeof notes>);

  const sortedDates = Object.keys(groupedNotes).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  const handleUploadFile = () => {
    // TODO: Implement file upload
    setSheetOpen(false);
    push("RecordingsView", {});
  };

  const handleStartRecord = () => {
    // TODO: Implement recording start
    setSheetOpen(false);
    push("NoteView", { id: "new" });
  };

  const handleNoteClick = (id: string) => {
    push("NoteView", { id });
  };

  const formatDateHeader = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
  };

  return {
    sheetOpen,
    setSheetOpen,
    upcomingExpanded,
    setUpcomingExpanded,
    notes,
    groupedNotes,
    sortedDates,
    handleUploadFile,
    handleStartRecord,
    handleNoteClick,
    formatDateHeader,
  };
}
