import { cn } from "@hypr/ui/lib/utils";
import { motion } from "motion/react";

interface TriggerButtonProps {
  isDynamic: boolean;
  onClick: () => void;
}

export default function TriggerButton({
  isDynamic,
  onClick,
}: TriggerButtonProps) {
  return (
    <motion.button
      key="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center overflow-clip rounded-full border bg-yellow-100 p-1 shadow-2xl transition-transform hover:scale-105",
      )}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <img
        src={isDynamic ? "/assets/dynamic.gif" : "/assets/static.png"}
        alt="Help"
        className="size-10"
      />
    </motion.button>
  );
}
