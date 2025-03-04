import { createFileRoute } from "@tanstack/react-router";

import MyTasks from "@/components/home/my-tasks";
import RecentNotes from "@/components/home/recent-notes";
import WorkspaceCalendar from "@/components/home/workspace-calendar";

export const Route = createFileRoute("/app/home")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-3xl w-full mx-auto px-8 pt-6 pb-12">
        <RecentNotes />
        <WorkspaceCalendar />
        <MyTasks />
      </div>
    </div>
  );
}
