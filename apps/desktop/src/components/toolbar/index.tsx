import { useMatch } from "@tanstack/react-router";

import { useEditMode } from "@/contexts/edit-mode-context";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { CalendarToolbar, DefaultToolbar, EntityToolbar, MainToolbar, NoteToolbar, TranscriptToolbar } from "./bars";

export default function Toolbar() {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const organizationMatch = useMatch({ from: "/app/organization/$id", shouldThrow: false });
  const humanMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });
  const calendarMatch = useMatch({ from: "/app/calendar", shouldThrow: false });
  const plansMatch = useMatch({ from: "/app/plans", shouldThrow: false });
  const transcriptMatch = useMatch({ from: "/app/transcript/$id", shouldThrow: false });

  const { isEditing, toggleEditMode } = useEditMode();

  const isMain = getCurrentWebviewWindowLabel() === "main";
  const isNote = !!noteMatch;
  const isOrg = !!organizationMatch;
  const isHuman = !!humanMatch;
  const isCalendar = !!calendarMatch;
  const isPlans = !!plansMatch;
  const isTranscript = !!transcriptMatch;

  if (isCalendar) {
    const date = calendarMatch?.search?.date ? new Date(calendarMatch.search.date as string) : new Date();
    return <CalendarToolbar date={date} />;
  }

  if (isPlans) {
    return <DefaultToolbar title="Plans" />;
  }

  if (!isMain) {
    if (isNote) {
      return <NoteToolbar />;
    }

    if (isOrg || isHuman) {
      return (
        <EntityToolbar
          isEditing={isEditing}
          onEditToggle={toggleEditMode}
        />
      );
    }

    if (isTranscript) {
      return <TranscriptToolbar />;
    }

    return null;
  }

  return <MainToolbar />;
}
