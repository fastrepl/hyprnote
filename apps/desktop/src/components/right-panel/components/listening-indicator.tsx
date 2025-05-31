import { EarIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function ListeningIndicator() {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const dotAnimation = [".", "..", "..."];
    let currentDotIndex = 0;
    const intervalId = setInterval(() => {
      currentDotIndex = (currentDotIndex + 1) % dotAnimation.length;
      setDots(dotAnimation[currentDotIndex]);
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex items-center justify-center py-2 pb-4 text-neutral-400 text-sm">
      <EarIcon size={14} className="mr-1.5" />
      <span>Listening</span>
      <span className="inline-block w-9 ml-0.5">{dots}</span>
    </div>
  );
}
