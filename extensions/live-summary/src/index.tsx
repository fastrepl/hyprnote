import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";

import { createClient, createConfig } from "@hypr/client";
import { LiveSummaryResponse } from "@hypr/client/gen/types";
export { postApiNativeLiveSummaryOptions } from "@hypr/client/gen/tanstack";

import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as dbCommands } from "@hypr/plugin-db";
import { postApiNativeLiveSummary } from "@hypr/client/gen/sdk";

// TODO
const client = createClient(
  createConfig({
    fetch,
    auth: () => "123",
    baseUrl: "http://localhost:1234",
  }),
);

interface LiveSummaryToastProps {
  onClose: () => void;
}

const DEFAULT_INTERVAL = 10 * 1000;

export default function LiveSummaryToast({ onClose }: LiveSummaryToastProps) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = useQuery({
    queryKey: ["config"],
    queryFn: () => dbCommands.getConfig(),
  });

  const summary = useQuery({
    queryKey: ["summary"],
    enabled: !!config.data,
    refetchInterval: DEFAULT_INTERVAL,
    staleTime: 0,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      if (!config.data) {
        return null;
      }

      const timeline_view = await listenerCommands.getSessionTimeline({
        last_n_seconds: 30,
      });

      const { data } = await postApiNativeLiveSummary({
        client,
        body: {
          config: config.data,
          timeline_view,
        },
        signal,
        throwOnError: true,
      });
      return data;
    },
  });

  const refetchSummary = async () => {
    await summary.refetch();
  };

  useEffect(() => {
    if (summary.isFetching) {
      setProgress(0);
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + 100 / (DEFAULT_INTERVAL / 1000);
          return Math.min(next, 100);
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [summary.isFetching]);

  useEffect(() => {
    if (summary.status === "success") {
      setProgress(100);
    }
  }, [summary.status]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="relative flex w-[420px] flex-col overflow-hidden rounded-xl border bg-white shadow-2xl"
    >
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="w-fit overflow-clip rounded-full border bg-yellow-100 p-1">
            <img
              src="/assets/dynamic.gif"
              alt="AI Assistant"
              className="size-6"
            />
          </div>
          <div className="text-sm font-medium text-neutral-900">
            Live Summary
          </div>
          <div className="relative ml-auto size-4">
            <button onClick={refetchSummary}>
              <ProgressCircle progress={progress} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-neutral-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-500"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
        <Summary summary={summary.data} />
      </div>
    </motion.div>
  );
}

function ProgressCircle({ progress }: { progress: number }) {
  return (
    <svg className="size-4" viewBox="0 0 24 24">
      <circle
        className="stroke-neutral-200"
        cx="12"
        cy="12"
        r="10"
        fill="none"
        strokeWidth="2.5"
      />
      <motion.circle
        className="stroke-blue-500"
        cx="12"
        cy="12"
        r="10"
        fill="none"
        strokeWidth="2.5"
        strokeDasharray="62.83"
        strokeDashoffset={62.83 - (progress / 100) * 62.83}
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

function Summary({
  summary,
}: {
  summary: LiveSummaryResponse | null | undefined;
}) {
  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-4 text-sm text-neutral-700">
      {summary.blocks.map((block, index) => (
        <div key={index} className="space-y-2">
          {block.points.map((point, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-300" />
              <div className="text-neutral-900 leading-normal">{point}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
