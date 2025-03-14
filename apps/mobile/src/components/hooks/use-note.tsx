import { ConversationChunk, type Session } from "@hypr/plugin-db";
import { useState } from "react";

const mockParticipants = [
  {
    id: "1",
    full_name: "John Doe",
    job_title: "Product Manager",
    organization_id: "Acme Inc",
  },
  {
    id: "2",
    full_name: "Jane Smith",
    job_title: "Software Engineer",
    organization_id: "Acme Inc",
  },
  {
    id: "3",
    full_name: "Alex Johnson",
    job_title: "Designer",
    organization_id: "Design Studio",
  },
];

const mockEvent = {
  id: "event-123",
  title: "Weekly Team Sync",
  start_time: "2025-03-13T14:00:00",
  end_time: "2025-03-13T15:00:00",
  location: "Conference Room A",
};

const mockTags = [
  { id: "tag-1", name: "Important" },
  { id: "tag-2", name: "Follow-up" },
  { id: "tag-3", name: "Decision" },
  { id: "tag-4", name: "Action Item" },
  { id: "tag-5", name: "Question" },
];

interface UseNoteProps {
  session: Session;
}

export function useNote({ session }: UseNoteProps) {
  const [participantsSheetOpen, setParticipantsSheetOpen] = useState(false);
  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false);
  const [tagsSheetOpen, setTagsSheetOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [title, setTitle] = useState(session.title || "Untitled");
  const [content, setContent] = useState(session.enhanced_memo_html || session.raw_memo_html);

  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const groupedParticipants = {
    "Acme Inc": mockParticipants.filter(p => p.organization_id === "Acme Inc"),
    "Design Studio": mockParticipants.filter(p => p.organization_id === "Design Studio"),
  };

  // Handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    // TODO: Implement saving title to backend
  };

  const handleTitleBlur = () => {
    if (!title.trim()) {
      setTitle("Untitled");
    }
    // TODO: Implement saving title to backend
  };

  const handleEditorChange = (html: string) => {
    setContent(html);
    // TODO: Implement saving content to backend
  };

  const handleViewInCalendar = () => {
    // TODO: Implement calendar navigation
    setCalendarSheetOpen(false);
  };

  const handlePublishNote = () => {
    // TODO: Implement note publishing
    setShareSheetOpen(false);
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const startFormat = start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const endFormat = end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${startFormat} - ${endFormat}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return {
    participantsSheetOpen,
    setParticipantsSheetOpen,
    calendarSheetOpen,
    setCalendarSheetOpen,
    tagsSheetOpen,
    setTagsSheetOpen,
    shareSheetOpen,
    setShareSheetOpen,
    title,
    content,
    currentDate,
    mockParticipants,
    mockEvent,
    mockTags,
    groupedParticipants,
    handleTitleChange,
    handleTitleBlur,
    handleEditorChange,
    handleViewInCalendar,
    handlePublishNote,
    formatEventTime,
    getInitials,
  };
}
