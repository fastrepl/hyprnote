import { useMatch } from "@tanstack/react-router";
import { BadgeType } from "../components/chat";
import { DefaultChatView } from "../components/chat/default-chat-view";
import { EntityChatView } from "../components/chat/entity-chat-view";
import { NoteChatView } from "../components/chat/note-chat-view";

export function ChatView() {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const humanMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });
  const organizationMatch = useMatch({ from: "/app/organization/$id", shouldThrow: false });

  const isNotePage = noteMatch?.status === "success" && noteMatch.params.id;
  const isHumanPage = humanMatch?.status === "success" && humanMatch.params.id;
  const isOrgPage = organizationMatch?.status === "success" && organizationMatch.params.id;

  const entityId = isNotePage
    ? noteMatch.params.id
    : isHumanPage
    ? humanMatch.params.id
    : isOrgPage
    ? organizationMatch.params.id
    : null;

  const entityType: BadgeType | null = isNotePage
    ? "note"
    : isHumanPage
    ? "human"
    : isOrgPage
    ? "organization"
    : null;

  if (isNotePage) {
    return <NoteChatView noteId={noteMatch.params.id} />;
  } else if (isHumanPage || isOrgPage) {
    return <EntityChatView entityId={entityId!} entityType={entityType as BadgeType} />;
  } else {
    return <DefaultChatView />;
  }
}
