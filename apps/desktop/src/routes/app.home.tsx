import { createFileRoute } from "@tanstack/react-router";

import RecentNotes from "@/components/home/recent-notes";
import WorkspaceCalendar from "@/components/home/calendar";

export const Route = createFileRoute("/app/home")({
  component: Component,
});

function Component() {
  return (
    <main className="flex h-full flex-col overflow-hidden bg-white dark:bg-neutral-800">
      <div className="overflow-y-auto sm:px-8 sm:py-12 px-4 py-6">
        <div className="mx-auto max-w-3xl w-full">
          <RecentNotes />
          <WorkspaceCalendar />
        </div>
      </div>
    </main>
  );
}
