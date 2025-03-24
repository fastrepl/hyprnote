import { useMatch } from "@tanstack/react-router";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { CalendarToolbar } from "./calendar-toolbar";
import { EntityToolbar } from "./entity-toolbar";
import { MainToolbar } from "./main-toolbar";
import { NoteToolbar } from "./note-toolbar";

export default function Toolbar() {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const organizationMatch = useMatch({ from: "/app/organization/$id", shouldThrow: false });
  const humanMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });
  const calendarMatch = useMatch({ from: "/app/calendar", shouldThrow: false });

  const isMain = getCurrentWebviewWindowLabel() === "main";
  const isNote = !!noteMatch;
  const isOrg = !!organizationMatch;
  const isHuman = !!humanMatch;
  const isCalendar = !!calendarMatch;

  // Handle calendar view
  if (isCalendar) {
    const date = calendarMatch?.search?.date ? new Date(calendarMatch.search.date as string) : new Date();
    return <CalendarToolbar date={date} />;
  }

  // Non-main window - specific views
  if (!isMain) {
    // For note view - show only share button
    if (isNote) {
      return <NoteToolbar />;
    }
    
    // For org view - show organization name in center
    if (isOrg) {
      const { organization } = organizationMatch?.loaderData || { organization: { name: "" } };
      return <EntityToolbar title={organization?.name || ""} />;
    }
    
    // For human view - show human name in center
    if (isHuman) {
      const { human } = humanMatch?.loaderData || { human: { full_name: "" } };
      return <EntityToolbar title={human?.full_name || ""} />;
    }
    
    // For other views in non-main window, don't render
    return null;
  }

  // Main window - default behavior
  return <MainToolbar />;
}
