import { createFileRoute } from "@tanstack/react-router";

import MyTasks from "@/components/home/my-tasks";
import RecentNotes from "@/components/home/recent-notes";
import WorkspaceCalendar from "@/components/home/workspace-calendar";

export const Route = createFileRoute("/app/home")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="max-w-5xl mx-auto p-8 overflow-y-auto h-full">
      <RecentNotes />
      <WorkspaceCalendar />
      <MyTasks />
    </div>
  );
}
