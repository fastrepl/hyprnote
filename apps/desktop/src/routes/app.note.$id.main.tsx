import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { useEffect } from "react";

import EditorArea from "@/components/note/editor-area";
import { commands as dbCommands } from "@hypr/plugin-db";

export const Route = createFileRoute("/app/note/$id/main")({
  component: Component,
});

function Component() {
  const { session } = useLoaderData({ from: "/app/note/$id" });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["delete-session", session.id],
    mutationFn: () => dbCommands.deleteSession(session.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      console.error(error);
    },
  });

  useEffect(() => {
    return () => {
      const isNoteEmpty = !session.title
        && session.raw_memo_html === "<p></p>"
        && session.conversations.length === 0
        && (!session.enhanced_memo_html
          || session.enhanced_memo_html === null
          || session.enhanced_memo_html === "<p></p>");

      if (isNoteEmpty) {
        mutation.mutate();
      }
    };
  }, [session.id]);

  return (
    <main className="flex h-full overflow-hidden bg-white">
      <div className="h-full flex-1">
        <EditorArea editable={true} />
      </div>
    </main>
  );
}
