import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import LeftSidebar from "@/components/left-sidebar";
import RightPanel from "@/components/note/right-panel";
import Toolbar from "@/components/toolbar";
import { SessionProvider } from "@/contexts";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";

export const Route = createFileRoute("/app/note/$id")({
  component: Component,
  loader: ({ context: { queryClient }, params: { id } }) => {
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
        } catch (e) {
          console.error(e);
        }

        if (!session) {
          console.log("failed_to_find_session", id);
          throw redirect({ to: "/app" });
        }

        return { session };
      },
    });
  },
});

function Component() {
  const { session } = Route.useLoaderData();

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen w-screen overflow-hidden">
        <LeftSidebar />
        <div className="flex-1 flex h-screen w-screen flex-col overflow-hidden">
          <Toolbar />
          <div className="flex h-full overflow-hidden">
            <div className="flex-1">
              <Outlet />
            </div>
            <RightPanel />
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
