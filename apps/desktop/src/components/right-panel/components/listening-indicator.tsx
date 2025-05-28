import { EarIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function ListeningIndicator() {
  const [animatedDots, setAnimatedDots] = useState(".");

  useEffect(() => {
    const dotAnimation = [".", "..", "..."];
    let currentDotIndex = 0;
    const intervalId = setInterval(() => {
      currentDotIndex = (currentDotIndex + 1) % dotAnimation.length;
      setAnimatedDots(dotAnimation[currentDotIndex]);
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex items-center gap-2 justify-center py-2 pb-4 text-neutral-400 text-sm">
      <EarIcon size={14} /> Listening{animatedDots}
    </div>
  );
}
