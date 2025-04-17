import { cn } from "@hypr/ui/lib/utils";
import { type AnimationProps, motion, type MotionProps } from "motion/react";

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

export default function ShinyButton({ children, className, onClick, ...props }: ShinyButtonProps) {
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
