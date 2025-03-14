import { cn } from "@hypr/ui/lib/utils";
import { motion } from "motion/react";

const getRandomValues = (max: number, length: number, baseLength: number) => {
  const values: number[] = [];
  for (let i = 0; i < length - 1; i++) {
    values.push((Math.random() * max - max / 2) + (baseLength / 100) * max);
  }
  values.push(values[0]); // Loop back to the first value for smooth looping animation
  return values;
};

type EqualizerStickProps = {
  baseLength: number;
  amplitude: number;
};

function EqualizerStick({ baseLength, amplitude }: EqualizerStickProps) {
  const scaledBaseLength = baseLength * Math.max(0.2, Math.max(amplitude, 0.1));

  return (
    <motion.div
      className="rounded-full bg-neutral-300"
      style={{ width: "2px" }}
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
  className?: string;
  amplitude: number;
};

export function DancingSticks({ className, amplitude }: DancingSticksProps) {
  return (
    <div className={cn("flex h-4 w-[17px] items-center justify-center gap-[1px]", className)}>
      <EqualizerStick baseLength={50} amplitude={amplitude} />
      <EqualizerStick baseLength={65} amplitude={amplitude} />
      <EqualizerStick baseLength={85} amplitude={amplitude} />
      <EqualizerStick baseLength={100} amplitude={amplitude} />
      <EqualizerStick baseLength={85} amplitude={amplitude} />
      <EqualizerStick baseLength={65} amplitude={amplitude} />
    </div>
  );
}
