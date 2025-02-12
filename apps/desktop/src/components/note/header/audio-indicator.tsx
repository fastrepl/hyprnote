import { useState, useEffect } from "react";
import { motion } from "motion/react";

import { useSession } from "@/contexts";

export default function AudioIndicator() {
  const { mic, speaker } = useSession((state) => state.amplitude);
  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    const sample = Math.max(mic, speaker) / 10;
    setAmplitude(Math.min(sample, 1));
  }, [mic, speaker]);

  const [multipliers, setMultipliers] = useState([0.4, 1, 0.6]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMultipliers([
        Math.random() * 0.8 + 0.2,
        Math.random() * 0.8 + 0.2,
        Math.random() * 0.8 + 0.2,
      ]);
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const dot = 4;

  return (
    <div
      className="flex items-end justify-center rounded-full"
      style={{ width: 12, height: 12 }}
    >
      <div className="flex gap-[2px] pb-[2px]">
        {multipliers.map((multiplier, index) => (
          <motion.div
            key={index}
            className="rounded-full bg-primary/80"
            style={{ width: dot }}
            animate={{
              height: amplitude ? dot * (1 + multiplier * 2 * amplitude) : dot,
              borderRadius: amplitude
                ? `4px 4px ${dot / 2}px ${dot / 2}px`
                : "9999px",
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
          />
        ))}
      </div>
    </div>
  );
}
