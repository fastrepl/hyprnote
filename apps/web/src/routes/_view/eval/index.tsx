import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { cn } from "@hypr/utils";

import { ChartSkeleton, EvalChart } from "./-chart";
import { EVAL_DATA, type TaskName } from "./-data";

const validateSearch = z.object({
  task: z.string().optional(),
});

export const Route = createFileRoute("/_view/eval/")({
  component: Component,
  validateSearch,
  loader: () => EVAL_DATA,
});

function Component() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const evalData = Route.useLoaderData();
  const tasks = Object.keys(evalData) as TaskName[];
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    setIsChartReady(false);
    const timer = setTimeout(() => setIsChartReady(true), 0);
    return () => clearTimeout(timer);
  }, [search.task]);

  const selectedTask =
    search.task && tasks.includes(search.task as TaskName) ? (search.task as TaskName) : tasks[0];

  const handleTaskClick = (task: TaskName) => {
    navigate({
      search: { task },
      resetScroll: false,
    });
  };

  return (
    <main className="flex-1 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-serif text-stone-600 mb-8 text-center">
          Model Evaluation Results
        </h1>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {tasks.map((task) => (
            <button
              key={task}
              onClick={() => handleTaskClick(task)}
              className={cn([
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                selectedTask === task
                  ? "bg-stone-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              ])}
            >
              {task}
            </button>
          ))}
        </div>

        <div className="h-[600px] w-full">
          {isChartReady ? <EvalChart data={evalData[selectedTask]} /> : <ChartSkeleton />}
        </div>
      </div>
    </main>
  );
}
