import WorkspaceCalendar from "@/components/workspace-calendar";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { addMonths, format, subMonths } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

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

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const handlePreviousMonth = () => {
    setCurrentDate(prevDate => subMonths(prevDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prevDate => addMonths(prevDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(today);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col bg-white text-neutral-700">
      <header className="flex w-full flex-col">
        <div data-tauri-drag-region className="relative min-h-11 w-full flex items-center justify-center">
          <h1 className="text-xl font-medium">
            <strong data-tauri-drag-region>{format(currentDate, "MMMM")}</strong> {format(currentDate, "yyyy")}
          </h1>

          <div className="absolute right-2 flex h-fit rounded-md overflow-clip border border-neutral-200">
            <Button
              variant="outline"
              className="p-0.5 rounded-none border-none"
              onClick={handlePreviousMonth}
            >
              <ChevronLeftIcon size={16} />
            </Button>

            <Button
              variant="outline"
              className="text-sm px-1 py-0.5 rounded-none border-none"
              onClick={handleToday}
            >
              <Trans>Today</Trans>
            </Button>

            <Button
              variant="outline"
              className="p-0.5 rounded-none border-none"
              onClick={handleNextMonth}
            >
              <ChevronRightIcon size={16} />
            </Button>
          </div>
        </div>

        <div className="border-b border-neutral-200 grid grid-cols-7">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={`text-center font-light text-sm pb-2 pt-1 ${
                index === weekDays.length - 1 ? "border-r-0" : ""
              }`}
            >
              {day}
            </div>
          ))}
        </div>
      </header>

      <div className="flex-1 h-full">
        <WorkspaceCalendar currentDate={currentDate} sessions={sessions} />
      </div>
    </div>
  );
}
