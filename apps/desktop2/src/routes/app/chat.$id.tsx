import { createFileRoute } from "@tanstack/react-router";

import { ChatView } from "../../components/chat/view";

export const Route = createFileRoute("/app/chat/$id")({
  component: Component,
});

function Component() {
  const { id } = Route.useParams();

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <ChatView
        initialChatGroupId={id}
        isWindow={true}
      />
    </div>
  );
}
