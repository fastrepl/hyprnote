import { useEffect, useState } from "react";

import { useSession } from "@/contexts";

export default function AudioIndicator() {
  const { mic, speaker } = useSession((state) => state.amplitude);
  const [amplitude, setAmplitude] = useState(0);
  const [heights, setHeights] = useState([0, 0, 0]);

  useEffect(() => {
    const sample = Math.max(mic, speaker) / 10;
    setAmplitude(Math.min(sample, 1));
  }, [mic, speaker]);

  useEffect(() => {
    if (amplitude === 0) {
      setHeights([2, 2, 2]);
      return;
    }

    // Update heights every 100ms for animation
    const interval = setInterval(() => {
      // Center line height is proportional to amplitude with some randomness
      const maxHeight = Math.min(24, Math.max(4, amplitude * 24));
      const centerHeight = maxHeight * (0.7 + Math.random() * 0.3); // Random between 70-100% of max

      // Side lines have identical heights, not exceeding center
      const sideHeight = Math.min(centerHeight, Math.random() * centerHeight);

      setHeights([sideHeight, centerHeight, sideHeight]);
    }, 100);

    return () => clearInterval(interval);
  }, [amplitude]);

  return (
    <div className="flex items-center gap-0.5">
      {heights.map((height, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-white transition-all duration-100"
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
}
