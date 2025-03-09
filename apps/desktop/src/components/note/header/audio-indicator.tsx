import { useEffect, useState } from "react";

import { useOngoingSession } from "@/contexts/ongoing-session";

export default function AudioIndicator() {
  const { mic, speaker } = useOngoingSession((state) => state.amplitude);
  const [amplitude, setAmplitude] = useState(0);
  const [heights, setHeights] = useState([0, 0, 0]);

  useEffect(() => {
    const sample = Math.max(mic, speaker) / 5;
    setAmplitude(Math.min(sample, 1));
  }, [mic, speaker]);

  useEffect(() => {
    if (amplitude === 0) {
      setHeights([2, 2, 2]);
      return;
    }

    let prevHeights = heights;
    const damping = 0.8;
    const springStrength = 0.3;

    const interval = setInterval(() => {
      const maxHeight = Math.min(16, Math.max(4, amplitude * 16));
      const targetCenterHeight = maxHeight * (0.8 + Math.random() * 0.2);
      const targetSideHeight = Math.min(
        targetCenterHeight,
        targetCenterHeight * (0.5 + Math.random() * 0.5),
      );

      const newHeights = prevHeights.map((prev, i) => {
        const target = i === 1 ? targetCenterHeight : targetSideHeight;
        const velocity = (target - prev) * springStrength;
        const newHeight = prev + velocity * damping;
        return newHeight;
      });

      setHeights(newHeights);
      prevHeights = newHeights;
    }, 50);

    return () => clearInterval(interval);
  }, [amplitude]);

  return (
    <div className="flex h-4 items-center gap-0.5">
      {heights.map((height, i) => (
        <div
          key={i}
          className="w-0.5 rounded-full bg-white transition-all duration-[400ms] ease-out dark:bg-neutral-100"
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
}
