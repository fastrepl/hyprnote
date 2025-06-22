import { cn } from "@hypr/ui/lib/utils";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface TitleShimmerProps {
  children: React.ReactNode;
  className?: string;
  isShimmering?: boolean;
}

export default function TitleShimmer({ children, className, isShimmering = false }: TitleShimmerProps) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const handleResize = () => setKey(prev => prev + 1);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isShimmering) {
    return <div className={cn("relative w-full", className)}>{children}</div>;
  }

  return (
    <div key={key} className={cn("relative w-full overflow-hidden", className)}>
      <motion.div
        className="absolute inset-0 z-10 pointer-events-none"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 1.2,
          ease: "easeInOut",
          repeatDelay: 0.5,
        }}
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
          width: "50%",
        }}
      />
      <div className="relative opacity-60 animate-pulse">
        {children}
      </div>
    </div>
  );
}
