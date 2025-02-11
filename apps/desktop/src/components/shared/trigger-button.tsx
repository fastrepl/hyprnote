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
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "flex items-center justify-center overflow-clip rounded-full border bg-neutral-50 p-1 shadow-2xl hover:bg-neutral-100",
      )}
    >
      <img
        src={isDynamic ? "/assets/dynamic.gif" : "/assets/static.png"}
        alt="Help"
        className="size-10"
      />
    </motion.button>
  );
}
