import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import LeftSidebar from "@/components/left-sidebar";
import RightPanel from "@/components/note/right-panel";
import Toolbar from "@/components/toolbar";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";

const PATH = "/app/note/$id";

export const Route = createFileRoute(PATH)({
  component: Component,
  beforeLoad: ({ context: { queryClient, sessionsStore }, params: { id } }) => {
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
          throw notFound();
        }

        const { insert } = sessionsStore.getState();
        insert(session);
      },
    });
  },
});

function Component() {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1">
        <Outlet />
      </div>
      <RightPanel />
    </div>
  );
}
