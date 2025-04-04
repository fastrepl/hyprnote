import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
import { useEffect, useState } from "react";

import { useOngoingSession } from "@hypr/utils/contexts";

export default function SoundIndicator(
  { color = "#e5e5e5", input = "all", size = "default" }: {
    color?: string;
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

  return <DancingSticks amplitude={amplitude} color={color} size={size} />;
}
