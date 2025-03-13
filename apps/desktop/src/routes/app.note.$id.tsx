import EditorArea from "@/components/note/editor-area";
import { useSession } from "@/contexts/session";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/app/note/$id")({
  component: Component,
  loader: ({ context: { queryClient }, params: { id } }) => {
    return queryClient.fetchQuery({
      queryKey: ["note", id],
      queryFn: async () => {
        let session: Session | null = null;

        try {
          const [s, _] = await Promise.all([
            dbCommands.getSession({ id }),
            dbCommands.visitSession(id),
          ]);

          session = s;
        } catch {}

        if (!session) {
          throw redirect({ to: "/app" });
        }

        return { session };
      },
    });
  },
});

function Component() {
  const { session } = Route.useLoaderData();
  const setSession = useSession((s) => s.setSession);

  useEffect(() => {
    setSession(session);
  }, [setSession, session]);

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
        <EditorArea />
      </div>
    </main>
  );
}
