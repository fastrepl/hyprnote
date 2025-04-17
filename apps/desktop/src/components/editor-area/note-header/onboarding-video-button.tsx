import { Trans } from "@lingui/react/macro";
import { PlayIcon } from "lucide-react";
import { type AnimationProps, motion, type MotionProps } from "motion/react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import { WhenActive } from "./listen-button";

interface OnboardingVideoButtonProps {
  sessionId: string;
  ongoingSessionStatus: string;
  playVideo: () => void;
  stopVideo: () => void;
  isEnhanced?: boolean;
}

export default function OnboardingVideoButton({
  sessionId,
  ongoingSessionStatus,
  playVideo,
  stopVideo,
  isEnhanced = false,
}: OnboardingVideoButtonProps) {
  if (ongoingSessionStatus === "inactive" && !isEnhanced) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <ShinyButton
            onClick={playVideo}
            className={cn([
              "w-24 h-9 rounded-full border-2 transition-all cursor-pointer outline-none p-0 flex items-center justify-center gap-1",
              "bg-neutral-800 border-neutral-700 text-white text-xs font-medium",
            ])}
            style={{
              boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
            }}
          >
            <PlayIcon size={14} />
            <Trans>Play video</Trans>
          </ShinyButton>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <p>
            <Trans>Start onboarding video</Trans>
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (ongoingSessionStatus === "running_active") {
    return <WhenActive sessionId={sessionId} />;
  }

  return (
    <button
      onClick={playVideo}
      className={cn(
        "w-28 h-9 rounded-full transition-all hover:scale-95 cursor-pointer outline-none p-0 flex items-center justify-center gap-1 text-xs font-medium",
        "bg-neutral-200 border-2 border-neutral-400 text-neutral-600",
        "hover:bg-neutral-300 hover:text-neutral-800 hover:border-neutral-500",
      )}
      style={{ boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset" }}
    >
      <PlayIcon size={14} />
      <Trans>Play again</Trans>
    </button>
  );
}

interface ShinyButtonProps extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps>, MotionProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const animationProps = {
  initial: { "--x": "100%" },
  animate: { "--x": "-100%" },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: "loop",
    repeatDelay: 1,
    duration: 1.5,
  },
} as AnimationProps;

function ShinyButton({ children, className, onClick, ...props }: ShinyButtonProps) {
  return (
    <motion.button
      className={cn(
        "relative transition-all hover:scale-95 cursor-pointer outline-none flex items-center justify-center p-0",
        className,
      )}
      onClick={onClick}
      {...animationProps}
      {...props}
    >
      <span
        className="relative flex items-center justify-center w-full h-full"
        style={{
          maskImage:
            "linear-gradient(-75deg,rgba(255,255,255,1) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),rgba(255,255,255,1) calc(var(--x) + 100%))",
        }}
      >
        {children}
      </span>
      <span
        style={{
          mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          WebkitMask:
            "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          backgroundImage:
            "linear-gradient(-75deg,rgba(255,255,255,0.1) calc(var(--x)+20%),rgba(255,255,255,0.5) calc(var(--x)+25%),rgba(255,255,255,0.1) calc(var(--x)+100%))",
        }}
        className="absolute inset-0 z-10 block rounded-[inherit] p-px"
      >
      </span>
    </motion.button>
  );
}
