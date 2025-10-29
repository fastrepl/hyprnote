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
  color: string;
  height: number;
  stickWidth: number;
};

function EqualizerStick({ baseLength, amplitude, color, height, stickWidth }: EqualizerStickProps) {
  const scaledBaseLength = baseLength * Math.max(0.2, Math.max(amplitude, 0.1));

  return (
    <motion.div
      className="rounded-full"
      style={{ width: stickWidth, backgroundColor: color }}
      animate={{
        height: getRandomValues(height, 6, scaledBaseLength),
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
  height?: number;
  width?: number;
  stickWidth?: number;
  gap?: number;
};

const STICK_PATTERNS = {
  default: [50, 65, 85, 100, 85, 65],
  long: [50, 65, 75, 85, 95, 100, 95, 85, 75, 65, 50],
};

export function DancingSticks({
  color = "#e5e5e5",
  amplitude,
  size = "default",
  height,
  width,
  stickWidth,
  gap,
}: DancingSticksProps) {
  const resolvedHeight = height ?? 16;
  const resolvedWidth = width ?? (size === "long" ? 32 : 17);
  const resolvedStickWidth = stickWidth ?? 2;
  const resolvedGap = gap ?? 1;
  const isFlat = amplitude === 0;
  const pattern = STICK_PATTERNS[size];

  if (isFlat) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: resolvedHeight, width: resolvedWidth }}
      >
        <div
          className="rounded-full"
          style={{ width: resolvedWidth, height: 1, backgroundColor: color }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{ height: resolvedHeight, width: resolvedWidth, gap: resolvedGap }}
    >
      {pattern.map((baseLength, index) => (
        <EqualizerStick
          key={`${size}-${index}`}
          baseLength={baseLength}
          amplitude={amplitude}
          color={color}
          height={resolvedHeight}
          stickWidth={resolvedStickWidth}
        />
      ))}
    </div>
  );
}
