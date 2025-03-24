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

  if (isCalendar) {
    const date = calendarMatch?.search?.date ? new Date(calendarMatch.search.date as string) : new Date();
    return <CalendarToolbar date={date} />;
  }

  if (!isMain) {
    if (isNote) {
      return <NoteToolbar />;
    }

    if (isOrg) {
      const { organization } = organizationMatch?.loaderData || { organization: { name: "" } };
      return <EntityToolbar title={organization?.name || ""} />;
    }

    if (isHuman) {
      const { human } = humanMatch?.loaderData || { human: { full_name: "" } };
      return <EntityToolbar title={human?.full_name || ""} />;
    }

    return null;
  }

  return <MainToolbar />;
}
