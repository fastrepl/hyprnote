import { QueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import EditorArea from "@/components/note/editor";
import { SessionProvider } from "@/contexts/session";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";

const loader = (
  { context: { queryClient }, params: { id } }: { context: { queryClient: QueryClient }; params: { id: string } },
) => {
  return queryClient.fetchQuery({
    queryKey: ["session", id],
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
};

export const Route = createFileRoute("/app/note/$id/sub")({
  component: Component,
  loader,
});

function Component() {
  const { session } = Route.useLoaderData();

  return (
    <main className="flex h-full overflow-hidden bg-white">
      <div className="h-full flex-1">
        <SessionProvider session={session}>
          <EditorArea />
        </SessionProvider>
      </div>
    </main>
  );
}
