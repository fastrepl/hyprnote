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
  const u16max = 65535;

  useEffect(() => {
    let sample = 0;

    if (input === "all") {
      sample = Math.max(mic, speaker) / u16max;
    } else if (input === "mic") {
      sample = mic / u16max;
    } else if (input === "speaker") {
      sample = speaker / u16max;
    }

    setAmplitude(Math.min(sample, 1));
  }, [mic, speaker, input]);

  return <DancingSticks amplitude={amplitude} color={color} size={size} />;
}
