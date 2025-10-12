import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useCallback } from "react";
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
  const navigate = useNavigate();

  const handleSetChatGroupId = useCallback((id: string | undefined) => {
    navigate({ to: "/app/chat", search: { id } });
  }, [navigate]);

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <ChatView
        chatGroupId={id}
        setChatGroupId={handleSetChatGroupId}
        isWindow={true}
      />
    </div>
  );
}
