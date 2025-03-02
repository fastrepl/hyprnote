import { useEffect } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { commands as dbCommands } from "@hypr/plugin-db";

import { SessionProvider, useRightPanel } from "@/contexts";
import EditorArea from "@/components/note/editor";

export const Route = createFileRoute("/app/note/$id")({
  component: Component,
  loader: ({ context: { queryClient }, params: { id } }) => {
    return queryClient.fetchQuery({
      queryKey: ["note", id],
      queryFn: async () => {
        const session = await dbCommands.getSession({ id });
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

  const { hidePanel } = useRightPanel();

  useEffect(() => {
    return () => {
      hidePanel();
    };
  }, [hidePanel]);

  return (
    <SessionProvider session={session}>
      <main className="flex h-full overflow-hidden bg-white">
        <div className="h-full flex-1">
          <EditorArea />
        </div>
      </main>
    </SessionProvider>
  );
}
