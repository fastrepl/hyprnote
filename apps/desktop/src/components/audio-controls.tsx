import { useState } from "react";
import { RiPlayFill, RiPauseFill } from "@remixicon/react";

export const AudioControls = () => {
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <div className="fixed right-5 top-5 z-10 text-white">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="rounded-full bg-black p-2 transition-colors duration-200 hover:bg-black/70"
      >
        {isPlaying ? <RiPauseFill size={24} /> : <RiPlayFill size={24} />}
      </button>
    </div>
  );
};
