import { useMatch } from "@tanstack/react-router";

import { useEditMode } from "@/contexts/edit-mode-context";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { EntityToolbar, MainToolbar, NoteToolbar } from "./bars";

export default function Toolbar() {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const organizationMatch = useMatch({ from: "/app/organization/$id", shouldThrow: false });
  const humanMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });

  const { isEditing, toggleEditMode } = useEditMode();

  const isMain = getCurrentWebviewWindowLabel() === "main";
  const isNote = !!noteMatch;
  const isOrg = !!organizationMatch;
  const isHuman = !!humanMatch;

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

    return null;
  }

  return <MainToolbar />;
}
