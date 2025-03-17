import { useOngoingSession } from "@/contexts/ongoing-session";
import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
import { useEffect, useState } from "react";

export default function SoundIndicator({ theme = "light" }: { theme?: "light" | "dark" }) {
  const { mic, speaker } = useOngoingSession((state) => state.amplitude);
  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    const sample = Math.max(mic, speaker) / 5;
    setAmplitude(Math.min(sample, 1));
  }, [mic, speaker]);

  return <DancingSticks amplitude={amplitude} theme={theme} />;
}
