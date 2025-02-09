import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface LiveSummaryToastProps {
  summary: string;
}

export default function LiveSummaryToast({ summary }: LiveSummaryToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - (100 / 5000) * 100)); // 5 seconds
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-96 rounded-lg bg-white p-4 shadow-lg dark:bg-zinc-900"
    >
      <div className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        Live Summary
      </div>
      <div className="mb-3 text-sm text-zinc-900 dark:text-zinc-100">
        {summary}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}
