import { createFileRoute, redirect } from "@tanstack/react-router";
import { commands as dbCommands, type Config } from "@hypr/plugin-db";

import { SessionProvider } from "@/contexts";
import EditorArea from "@/components/note/editor";
import RightPanel from "@/components/note/right-panel";

function Component() {
  const { session } = Route.useLoaderData();

  return (
    <SessionProvider session={session}>
      <main className="flex h-full overflow-hidden bg-white">
        <div className="h-full flex-1">
          <EditorArea />
        </div>
        <RightPanel />
      </main>
    </SessionProvider>
  );
}

export const Route = createFileRoute("/app/note/$id")({
  component: Component,
  loader: ({ context: { queryClient }, params: { id } }) => {
    return queryClient.fetchQuery({
      queryKey: ["note", id],
      queryFn: async () => {
        const [session, config, customTemplates] = await Promise.all([
          dbCommands.getSession({ id }),
          dbCommands.getConfig(),
          dbCommands.listTemplates(),
        ]);
        if (!session) {
          throw redirect({ to: "/app" });
        }

        return {
          session,
          config: config as Config,
          templates: [...customTemplates],
        };
      },
    });
  },
});
