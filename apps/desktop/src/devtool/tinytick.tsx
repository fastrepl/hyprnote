import { useEffect, useState } from "react";
import { useManager } from "tinytick/ui-react";

import { cn } from "@hypr/utils";

interface TaskInfo {
  taskId: string;
  taskRunId: string;
  state: "scheduled" | "running";
  startTime?: number;
  nextTimestamp?: number;
}

export function TinyTickMonitor() {
  const manager = useManager();
  const [scheduledTasks, setScheduledTasks] = useState<TaskInfo[]>([]);
  const [runningTasks, setRunningTasks] = useState<TaskInfo[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [taskStartTimes] = useState<Map<string, number>>(() => new Map());

  useEffect(() => {
    if (!manager) {
      return;
    }

    const updateTasks = () => {
      const scheduledIds = manager.getScheduledTaskRunIds();
      const runningIds = manager.getRunningTaskRunIds();

      const scheduled = scheduledIds.map((taskRunId) => {
        const info = manager.getTaskRunInfo(taskRunId);
        return {
          taskId: info?.taskId || "unknown",
          taskRunId,
          state: "scheduled" as const,
          nextTimestamp: info?.nextTimestamp,
        };
      });

      const running = runningIds.map((taskRunId) => {
        const info = manager.getTaskRunInfo(taskRunId);

        if (!taskStartTimes.has(taskRunId)) {
          taskStartTimes.set(taskRunId, Date.now());
        }

        return {
          taskId: info?.taskId || "unknown",
          taskRunId,
          state: "running" as const,
          startTime: taskStartTimes.get(taskRunId),
        };
      });

      const allCurrentTaskIds = new Set([...scheduledIds, ...runningIds]);
      for (const taskRunId of taskStartTimes.keys()) {
        if (!allCurrentTaskIds.has(taskRunId)) {
          taskStartTimes.delete(taskRunId);
        }
      }

      setScheduledTasks(scheduled);
      setRunningTasks(running);
    };

    updateTasks();
    const intervalId = setInterval(updateTasks, 500);

    return () => clearInterval(intervalId);
  }, [manager, taskStartTimes]);

  const totalTasks = scheduledTasks.length + runningTasks.length;

  return (
    <section className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn([
          "flex items-center justify-between",
          "text-sm font-semibold",
          "hover:text-white/90",
          "transition-colors",
        ])}
      >
        <span>TinyTick Tasks</span>
        <div className="flex items-center gap-2">
          {totalTasks > 0 && (
            <span
              className={cn([
                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                "bg-blue-500/20 text-blue-400",
              ])}
            >
              {totalTasks}
            </span>
          )}
          <span
            className={cn([
              "transition-transform",
              isExpanded ? "rotate-180" : "rotate-0",
            ])}
          >
            ▼
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2">
          {runningTasks.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold text-green-400">
                Running ({runningTasks.length})
              </div>
              {runningTasks.map((task) => <TaskCard key={task.taskRunId} task={task} />)}
            </div>
          )}

          {scheduledTasks.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold text-blue-400">
                Scheduled ({scheduledTasks.length})
              </div>
              {scheduledTasks.map((task) => <TaskCard key={task.taskRunId} task={task} />)}
            </div>
          )}

          {totalTasks === 0 && (
            <div
              className={cn([
                "px-2 py-3 rounded-md",
                "text-[11px] text-center text-white/40",
                "border border-white/8",
              ])}
            >
              No active tasks
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TaskCard({ task }: { task: TaskInfo }) {
  const [elapsed, setElapsed] = useState(0);
  const [timeUntil, setTimeUntil] = useState(0);

  useEffect(() => {
    if (task.state !== "running" || !task.startTime) {
      return;
    }

    const updateElapsed = () => {
      setElapsed(Math.floor((Date.now() - task.startTime!) / 1000));
    };

    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);

    return () => clearInterval(intervalId);
  }, [task.state, task.startTime]);

  useEffect(() => {
    if (task.state !== "scheduled" || !task.nextTimestamp) {
      return;
    }

    const updateTimeUntil = () => {
      const remaining = Math.max(0, Math.floor((task.nextTimestamp! - Date.now()) / 1000));
      setTimeUntil(remaining);
    };

    updateTimeUntil();
    const intervalId = setInterval(updateTimeUntil, 1000);

    return () => clearInterval(intervalId);
  }, [task.state, task.nextTimestamp]);

  return (
    <div
      className={cn([
        "px-2 py-1.5 rounded-md",
        "border border-white/8",
        "bg-white/[0.02]",
        "text-[11px]",
      ])}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{task.taskId}</div>
          <div className="text-white/40 text-[10px] truncate">
            {task.taskRunId.slice(0, 8)}...
          </div>
        </div>
        {task.state === "running" && (
          <div
            className={cn([
              "flex items-center gap-1",
              "px-1.5 py-0.5 rounded",
              "bg-green-500/20 text-green-400",
              "text-[10px] font-semibold whitespace-nowrap",
            ])}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {elapsed}s
          </div>
        )}
        {task.state === "scheduled" && (
          <div
            className={cn([
              "px-1.5 py-0.5 rounded",
              "bg-blue-500/20 text-blue-400",
              "text-[10px] font-semibold whitespace-nowrap",
            ])}
          >
            {timeUntil > 0 ? `in ${timeUntil}s` : "pending"}
          </div>
        )}
      </div>
    </div>
  );
}
