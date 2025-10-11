import { createFileRoute } from "@tanstack/react-router";

import { z } from "zod";
import { ChatView } from "../../components/chat/view";

const validateSearch = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/app/chat")({
  validateSearch,
  component: Component,
});

function Component() {
  const { id } = Route.useSearch();

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <ChatView
        initialChatGroupId={id}
        isWindow={true}
      />
    </div>
  );
}
