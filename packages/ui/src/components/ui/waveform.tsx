import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type WaveformProps = {
  amplitude: number;
  color?: string;
  height?: number;
  width?: number;
  barWidth?: number;
  gap?: number;
  minBarHeight?: number;
};

export function Waveform({
  amplitude,
  color = "#ef4444",
  height = 16,
  width = 32,
  barWidth = 2,
  gap = 1,
  minBarHeight = 2,
}: WaveformProps) {
  const barCount = Math.floor(width / (barWidth + gap));
  const [history, setHistory] = useState<number[]>(() =>
    Array(barCount).fill(0),
  );
  const lastUpdateRef = useRef<number>(0);
  const updateInterval = 50;

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current < updateInterval) {
      return;
    }
    lastUpdateRef.current = now;

    setHistory((prev) => {
      const next = [...prev.slice(1), amplitude];
      return next;
    });
  }, [amplitude, barCount]);

  const isFlat = history.every((v) => v === 0);

  if (isFlat) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height, width }}
      >
        <div
          className="rounded-full"
          style={{ width, height: 1, backgroundColor: color }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-end justify-center"
      style={{ height, width, gap }}
    >
      {history.map((value, index) => {
        const barHeight = Math.max(
          minBarHeight,
          Math.min(height, value * height),
        );

        return (
          <motion.div
            key={index}
            className="rounded-sm"
            style={{
              width: barWidth,
              backgroundColor: color,
            }}
            initial={false}
            animate={{
              height: barHeight,
              opacity: 0.4 + value * 0.6,
            }}
            transition={{
              duration: 0.05,
              ease: "linear",
            }}
          />
        );
      })}
    </div>
  );
}
