import React, { useEffect, useRef, useState } from "react";

import { cn } from "../../lib/utils";

const DURATION = 1500;
const MAX_WORM_LENGTH = 0.6;

interface SplashProps {
  className?: string;
  repeatCount?: number;
}

interface SplashLoaderProps extends SplashProps {
  size?: number;
  strokeWidth?: number;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({
  className,
  repeatCount = Infinity,
  size = 64,
  strokeWidth = 2,
}) => {
  const [progress, setProgress] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const currentCycle = elapsed / DURATION;

      if (repeatCount !== Infinity && currentCycle >= repeatCount) {
        setProgress(1);
        return;
      }
      const newProgress = (elapsed % DURATION) / DURATION;
      setProgress(newProgress);

      animationRef.current = requestAnimationFrame(updateProgress);
    };

    animationRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [repeatCount]);

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();

      const easeInOutProgress =
        progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;

      const dynamicWormLength = MAX_WORM_LENGTH * Math.sin(progress * Math.PI);

      const rawHead = length * easeInOutProgress;
      const head = Math.min(rawHead, length);

      const visibleLength = length * dynamicWormLength;
      const hiddenLength = length - visibleLength;

      const finalVisibleLength = Math.max(visibleLength, 1);
      pathRef.current.style.strokeDasharray = `${finalVisibleLength} ${hiddenLength}`;

      if (progress < 0.01) {
        pathRef.current.style.strokeDashoffset = `${length}`;
      } else if (progress > 0.99) {
        pathRef.current.style.strokeDasharray = `1 ${length - 1}`;
        pathRef.current.style.strokeDashoffset = `0`;
      } else {
        const halfVisibleLength = visibleLength / 2;

        if (head < halfVisibleLength) {
          pathRef.current.style.strokeDashoffset = `${length}`;
        } else if (head > length - halfVisibleLength) {
          const remainingLength = length - head;
          const adjustedVisibleLength = Math.min(
            finalVisibleLength,
            2 * remainingLength
          );
          pathRef.current.style.strokeDasharray = `${adjustedVisibleLength} ${
            length - adjustedVisibleLength
          }`;
          pathRef.current.style.strokeDashoffset = `${
            length - head + adjustedVisibleLength / 2
          }`;
        } else {
          pathRef.current.style.strokeDashoffset = `${
            length - (head - halfVisibleLength)
          }`;
        }
      }
    }
  }, [progress]);

  return (
    <div className={cn("relative", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(0, 0, 0, 0.1)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
      </svg>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fbbf24"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute inset-0"
      >
        <path
          ref={pathRef}
          d="M13 2.17l-9.9 10.2A1 1 0 0 0 4 14h7a1 1 0 0 1 .94 1.35l-1.92 6.02a.5.5 0 0 0 .86.46l9.9-10.2A1 1 0 0 0 20 10h-7a1 1 0 0 1-.94-1.35l1.92-6.02a.5.5 0 0 0-.86-.46z"
          style={{
            transformOrigin: "center",
          }}
        />
      </svg>
    </div>
  );
};

export const SplashScreen: React.FC<SplashLoaderProps> = ({
  className,
  repeatCount = Infinity,
  size,
  strokeWidth,
}) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <SplashLoader
        repeatCount={repeatCount}
        size={size}
        strokeWidth={strokeWidth}
      />
    </div>
  );
};

export const Splash = SplashScreen;

export default Splash;
