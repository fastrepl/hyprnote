import { RiGoogleFill, RiAppleFill } from "@remixicon/react";
import { RetroGrid } from "../components/ui/retro-grid.tsx";
import { AudioControls } from "../components/AudioControls";
import { useState } from "react";

const Login = () => {
  const [isPlaying, setIsPlaying] = useState(true);

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
      <AudioControls />

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
