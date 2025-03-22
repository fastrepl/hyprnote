import { cn } from "@hypr/ui/lib/utils";
import { motion } from "motion/react";

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
  theme?: "light" | "dark";
};

function EqualizerStick({ baseLength, amplitude, theme }: EqualizerStickProps) {
  const scaledBaseLength = baseLength * Math.max(0.2, Math.max(amplitude, 0.1));

  return (
    <motion.div
      className={cn("rounded-full bg-neutral-800", theme === "dark" && "bg-neutral-200")}
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
  theme?: "light" | "dark";
  amplitude: number;
  size?: "default" | "long";
};

export function DancingSticks({ theme = "light", amplitude, size = "default" }: DancingSticksProps) {
  return (
    <div className={`flex h-4 ${size === "long" ? "w-[32px]" : "w-[17px]"} items-center justify-center gap-[1px]`}>
      {size === "default"
        ? (
          <>
            <EqualizerStick baseLength={50} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={65} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={85} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={100} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={85} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={65} amplitude={amplitude} theme={theme} />
          </>
        )
        : (
          <>
            <EqualizerStick baseLength={50} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={65} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={75} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={85} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={95} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={100} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={95} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={85} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={75} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={65} amplitude={amplitude} theme={theme} />
            <EqualizerStick baseLength={50} amplitude={amplitude} theme={theme} />
          </>
        )}
    </div>
  );
}
