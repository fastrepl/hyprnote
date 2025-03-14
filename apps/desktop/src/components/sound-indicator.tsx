import { useEffect, useState } from "react";

import { useOngoingSession } from "@/contexts/ongoing-session";
import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";

type SoundIndicatorProps = {
  className?: string;
};

export default function SoundIndicator({ className }: SoundIndicatorProps) {
  const { mic, speaker } = useOngoingSession((state) => state.amplitude);
  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    const sample = Math.max(mic, speaker) / 5;
    setAmplitude(Math.min(sample, 1));
  }, [mic, speaker]);

  return <DancingSticks amplitude={amplitude} />;
}
