import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { generateObject } from "ai";

import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as templateCommands } from "@hypr/plugin-template";
import { commands as listenerCommands } from "@hypr/plugin-listener";

import { modelProvider } from "@hypr/utils";
import { Button } from "@hypr/ui/components/ui/button";
import {
  WidgetHeader,
  type WidgetTwoByTwo,
  WidgetTwoByTwoWrapper,
} from "@hypr/ui/components/ui/widgets";

import {
  type LiveSummarySystemInput,
  type LiveSummaryUserInput,
  type LiveSummaryResponse,
  liveSummaryResponseSchema,
} from "../../types";

import { TEMPLATE_LIVE_SUMMARY_SYSTEM, TEMPLATE_LIVE_SUMMARY_USER } from ".";

const DEFAULT_INTERVAL = 10 * 1000;

const LiveShortSummary2x2: WidgetTwoByTwo = () => {
  const [progress, setProgress] = useState(0);

  const config = useQuery({
    queryKey: ["config"],
    queryFn: () => dbCommands.getConfig(),
  });

  const summary = useQuery({
    queryKey: ["live-summary", "run"],
    enabled: !!config.data,
    refetchInterval: DEFAULT_INTERVAL,
    staleTime: 0,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      if (!config.data) {
        return null;
      }

      const timeline_view = await listenerCommands.getTimeline({
        last_n_seconds: 100,
      });

      const systemMessageContent = await templateCommands.render(
        TEMPLATE_LIVE_SUMMARY_SYSTEM,
        {
          config: config.data,
        } satisfies LiveSummarySystemInput,
      );

      const userMessageContent = await templateCommands.render(
        TEMPLATE_LIVE_SUMMARY_USER,
        {
          timeline: timeline_view,
        } satisfies LiveSummaryUserInput,
      );

      const provider = await modelProvider();

      const { object } = await generateObject({
        model: provider.languageModel("any"),
        schema: liveSummaryResponseSchema,
        messages: [
          { role: "system", content: systemMessageContent },
          { role: "user", content: userMessageContent },
        ],
        abortSignal: signal,
      });

      return object;
    },
  });

  const refetchSummary = async () => {
    await summary.refetch();
  };

  useEffect(() => {
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 100 / (DEFAULT_INTERVAL / 1000);
        return Math.min(next, 100);
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [summary.dataUpdatedAt]);

  return (
    <WidgetTwoByTwoWrapper>
      <div className="p-4 pb-0">
        <WidgetHeader
          title="Live Summary"
          actions={[
            <Button
              key="refresh"
              variant="ghost"
              size="icon"
              onClick={refetchSummary}
              className="p-0"
            >
              <ProgressCircle progress={progress} />
            </Button>,
          ]}
        />
      </div>

      <div className="overflow-auto flex-1 p-4 scrollbar-none">
        <Summary summary={summary.data} />
      </div>
    </WidgetTwoByTwoWrapper>
  );
};

const ProgressCircle = ({ progress }: { progress: number }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const animationInterval = setInterval(() => {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setIsAnimating(false);
      }, 1625);
      return () => clearTimeout(timeout);
    }, 6625);

    return () => clearInterval(animationInterval);
  }, []);

  return (
    <div className="relative w-8 h-8">
      <svg className="w-8 h-8" viewBox="0 0 24 24">
        <circle
          style={{ stroke: "rgb(229 231 235)" }}
          cx="12"
          cy="12"
          r="10"
          fill="none"
          strokeWidth="1.5"
        />
        <motion.circle
          style={{ stroke: "rgb(59 130 246)" }}
          cx="12"
          cy="12"
          r="10"
          fill="none"
          strokeWidth="1.5"
          strokeDasharray={2 * Math.PI * 10}
          strokeDashoffset={2 * Math.PI * 10 * (1 - progress / 100)}
          strokeLinecap="round"
          transform="rotate(-90 12 12)"
        />
      </svg>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5">
        <img
          src={isAnimating ? "/summary-dynamic.gif" : "/summary-static.png"}
          alt="AI Assistant"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
};

const Summary = ({
  summary,
}: {
  summary: LiveSummaryResponse | null | undefined;
}) => {
  if (!summary) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-4 text-sm text-neutral-600 list-disc pl-4">
      {summary.points.map((point, index) => (
        <li key={index} className="text-neutral-900 leading-relaxed">
          {point}
        </li>
      ))}
    </ul>
  );
};

export default LiveShortSummary2x2;
