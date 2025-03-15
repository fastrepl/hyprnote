import WorkspaceCalendar from "@/components/workspace-calendar";
import type { RoutePath } from "@/types";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

export const Route = createFileRoute("/app/calendar")({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const sessions = await queryClient.fetchQuery({
      queryKey: ["sessions"],
      queryFn: () => dbCommands.listSessions(null),
    });

    return { sessions };
  },
});

function RouteComponent() {
  const { sessions } = Route.useLoaderData();

  const handleClick = (id: string) => {
    const path = "/app/note/$id/main" satisfies RoutePath;
    windowsCommands.windowEmitNavigate("main", path.replace("$id", id));
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col bg-white text-neutral-700">
      <header className="flex w-full flex-col">
        <div className="min-h-11 w-full" data-tauri-drag-region></div>

        <div className="border-b border-neutral-200">
          <div className="flex justify-between px-2 pb-4 items-center">
            <h1 className="text-2xl font-medium">March 2025</h1>

            <div className="flex h-fit rounded-md overflow-clip border border-neutral-200">
              <Button
                variant="outline"
                className="p-0.5 rounded-none border-none"
              >
                <ChevronLeftIcon size={16} />
              </Button>

              <Button
                variant="outline"
                className="text-sm px-1 py-0.5 rounded-none border-none"
              >
                Today
              </Button>

              <Button
                variant="outline"
                className="p-0.5 rounded-none border-none"
              >
                <ChevronRightIcon size={16} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={`text-center font-semibold pb-2 pt-1 ${index === weekDays.length - 1 ? "border-r-0" : ""}`}
              >
                {day}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 h-full overflow-y-auto scrollbar-none">
        <WorkspaceCalendar />
      </div>
    </div>
  );
}
