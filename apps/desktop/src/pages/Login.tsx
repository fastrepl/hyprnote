import { useState, useEffect } from "react";
import {
  RiGoogleFill,
  RiAppleFill,
  RiVolumeMuteFill,
  RiVolumeUpFill,
} from "@remixicon/react";
import { RetroGrid } from "../components/ui/retro-grid.tsx";

const Login = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [audio] = useState(new Audio("/bgm.mp3"));

  useEffect(() => {
    audio.loop = true;
    audio.play().catch((error) => console.log("Audio autoplay failed:", error));

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audio]);

  useEffect(() => {
    audio.muted = isMuted;
  }, [isMuted, audio]);

  const handleGoogleSignIn = () => {
    // Implement Google Sign In
    console.log("Google Sign In clicked");
  };

  const handleAppleSignIn = () => {
    // Implement Apple Sign In
    console.log("Apple Sign In clicked");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden text-white">
      <RetroGrid />

      <button
        onClick={() => setIsMuted(!isMuted)}
        className="fixed right-5 top-5 z-10 rounded-full bg-black p-2 transition-colors duration-200 hover:bg-black/70"
      >
        {isMuted ? (
          <RiVolumeMuteFill size={24} />
        ) : (
          <RiVolumeUpFill size={24} />
        )}
      </button>

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-black/40 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="mb-8 text-center text-4xl font-bold">Welcome to Hypr</h1>

        <button
          onClick={handleGoogleSignIn}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-gray-800 transition-transform duration-200 hover:scale-[1.02] hover:bg-gray-100"
        >
          <RiGoogleFill size={20} />
          <span>Continue with Google</span>
        </button>

        <button
          onClick={handleAppleSignIn}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-white transition-transform duration-200 hover:scale-[1.02] hover:bg-gray-900"
        >
          <RiAppleFill size={20} />
          <span>Continue with Apple</span>
        </button>
      </div>
    </div>
  );
};

export default Login;
