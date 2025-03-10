import { useEffect } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { commands as dbCommands, type Session } from "@hypr/plugin-db";

import { SessionProvider } from "@/contexts";
import EditorArea from "@/components/note/editor";

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
          throw redirect({ to: "/app/home" });
        }

        return { session };
      },
    });
  },
});

function Component() {
  const { session } = Route.useLoaderData();

  const queryClient = useQueryClient();

  const mutation = useMutation({
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
      // Don't call hidePanel during unmount to prevent max depth errors
      // hidePanel();

      const isNoteEmpty =
        !session.title?.trim() &&
        (!session.raw_memo_html?.trim() ||
          session.raw_memo_html === "<p></p>") &&
        (!session.enhanced_memo_html?.trim() ||
          session.enhanced_memo_html === "<p></p>");

      if (isNoteEmpty) {
        mutation.mutate();
      }
    };
  }, [session, mutation]);

  return (
    <SessionProvider session={session}>
      <main className="flex h-full overflow-hidden bg-white ">
        <div className="h-full flex-1">
          <EditorArea />
        </div>
      </main>
    </SessionProvider>
  );
}
