import { useEffect, useState } from "react";

import { useOngoingSession } from "@/contexts";
import { cn } from "@hypr/ui/lib/utils";
import EqualizerStick from "./equalizer-stick";

type SoundIndicatorProps = {
  className?: string;
};

export default function SoundIndicator({ className }: SoundIndicatorProps) {
  const { mic, speaker } = useOngoingSession((state) => state.amplitude);
  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    // Calculate amplitude from mic and speaker values
    const sample = Math.max(mic, speaker) / 5;
    setAmplitude(Math.min(sample, 1));
  }, [mic, speaker]);

  // Always show the indicator, even when there's no sound
  const effectiveAmplitude = amplitude > 0 ? amplitude : 0.1;

  return (
    <div className={cn("flex h-4 w-[17px] items-center justify-center gap-[1px]", className)}>
      <EqualizerStick baseLength={50} amplitude={effectiveAmplitude} />
      <EqualizerStick baseLength={65} amplitude={effectiveAmplitude} />
      <EqualizerStick baseLength={85} amplitude={effectiveAmplitude} />
      <EqualizerStick baseLength={100} amplitude={effectiveAmplitude} />
      <EqualizerStick baseLength={85} amplitude={effectiveAmplitude} />
      <EqualizerStick baseLength={65} amplitude={effectiveAmplitude} />
    </div>
  );
}
