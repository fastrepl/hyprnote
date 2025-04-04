import { motion } from "motion/react";

import { cn } from "../../lib/utils";

const getRandomValues = (max: number, length: number, baseLength: number) => {
  const values: number[] = [];
  for (let i = 0; i < length - 1; i++) {
    values.push((Math.random() * max - max / 2) + (baseLength / 100) * max);
  }
  values.push(values[0]);
  return values;
};

type EqualizerStickProps = {
  baseLength: number;
  amplitude: number;
  color: string;
};

function EqualizerStick({ baseLength, amplitude, color }: EqualizerStickProps) {
  const scaledBaseLength = baseLength * Math.max(0.2, Math.max(amplitude, 0.1));

  return (
    <motion.div
      className="rounded-full"
      style={{ width: "2px", backgroundColor: color }}
      animate={{
        height: getRandomValues(16, 6, scaledBaseLength),
      }}
      transition={{
        duration: 1.1,
        ease: "easeInOut",
        times: [0.2, 0.3, 0.5, 0.7, 1.1, 1.3, 1.7],
        repeat: Infinity,
      }}
    />
  );
}

type DancingSticksProps = {
  color?: string;
  amplitude: number;
  size?: "default" | "long";
};

const STICK_PATTERNS = {
  default: [50, 65, 85, 100, 85, 65],
  long: [50, 65, 75, 85, 95, 100, 95, 85, 75, 65, 50],
};

export function DancingSticks({ color = "#e5e5e5", amplitude, size = "default" }: DancingSticksProps) {
  const isFlat = amplitude === 0;
  const pattern = STICK_PATTERNS[size];
  const width = size === "long" ? "w-[32px]" : "w-[17px]";

  if (isFlat) {
    return (
      <div className={`flex h-4 ${width} items-center justify-center`}>
        <div className={`${width} h-px rounded-full`} style={{ backgroundColor: color }} />
      </div>
    );
  }

  return (
    <div className={`flex h-4 ${width} items-center justify-center gap-[1px]`}>
      {pattern.map((baseLength, index) => (
        <EqualizerStick
          key={`${size}-${index}`}
          baseLength={baseLength}
          amplitude={amplitude}
          color={color}
        />
      ))}
    </div>
  );
}
