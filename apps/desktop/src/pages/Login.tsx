import { RiGoogleFill, RiAppleFill } from "@remixicon/react";
import { RetroGrid } from "../components/ui/retro-grid.tsx";
import { AudioControls } from "../components/AudioControls";
import BlurFade from "../components/ui/blur-fade.tsx";
import SparklesText from "../components/ui/sparkles-text.tsx";
import ShimmerButton from "../components/ui/shimmer-button.tsx";

const Login = () => {
  const handleGoogleSignIn = () => {
    // Implement Google Sign In
    console.log("Google Sign In clicked");
  };

  const handleAppleSignIn = () => {
    // Implement Apple Sign In
    console.log("Apple Sign In clicked");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden text-black">
      <RetroGrid angle={30} />

      <AudioControls />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center rounded-2xl p-8">
        <BlurFade delay={0.25} inView>
          <h1
            className="mb-8 text-center text-4xl font-bold"
            style={{ fontFamily: "'Racing Sans One', cursive" }}
          >
            Welcome to{" "}
            <SparklesText
              text="HYPERNOTE"
              colors={{ first: "#FFD700", second: "#8A2BE2" }}
            />
          </h1>
        </BlurFade>

        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <ShimmerButton
            onClick={handleGoogleSignIn}
            className="flex flex-1 items-center justify-center gap-2"
          >
            <RiGoogleFill size={20} />
            <span>Continue with Google</span>
          </ShimmerButton>

          <ShimmerButton
            onClick={handleAppleSignIn}
            className="flex flex-1 items-center justify-center gap-2"
          >
            <RiAppleFill size={20} />
            <span>Continue with Apple</span>
          </ShimmerButton>
        </div>
      </div>
    </div>
  );
};

export default Login;
