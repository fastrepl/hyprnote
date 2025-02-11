import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface LiveSummaryToastProps {
  summary: string;
  onClose: () => void;
}

export default function LiveSummaryToast({
  summary,
  onClose,
}: LiveSummaryToastProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

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
        <div className="text-sm text-neutral-700">{summary}</div>
      </div>
    </motion.div>
  );
}
