import { useOngoingSession } from "@/contexts/ongoing-session";
import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
import { useEffect, useState } from "react";

export default function SoundIndicator(
  { theme = "light", input = "all", size = "default" }: {
    theme?: "light" | "dark";
    input?: "all" | "mic" | "speaker";
    size?: "default" | "long";
  },
) {
  const { mic, speaker } = useOngoingSession((state) => state.amplitude);
  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    let sample = 0;

    if (input === "all") {
      sample = Math.max(mic, speaker) / 5;
    } else if (input === "mic") {
      sample = mic / 5;
    } else if (input === "speaker") {
      sample = speaker / 5;
    }

    setAmplitude(Math.min(sample, 1));
  }, [mic, speaker, input]);

  return <DancingSticks amplitude={amplitude} theme={theme} size={size} />;
}
