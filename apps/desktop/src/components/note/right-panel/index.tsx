import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useRightPanel } from "@/contexts/right-panel";
import WidgetRenderer from "./renderer";

export default function RightPanel() {
  const { isExpanded, hidePanel } = useRightPanel();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 760);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);

    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  if (isMobile) {
    return (
      <div className="relative h-full">
        {isExpanded && (
          <div
            className="absolute inset-0 bg-black/30 z-40"
            onClick={hidePanel}
          />
        )}

        <motion.div
          initial={false}
          animate={{
            x: isExpanded ? 0 : "100%",
          }}
          transition={{ duration: 0.3 }}
          className="absolute right-0 top-0 z-50 h-full w-[380px] overflow-y-auto border-l bg-neutral-50 scrollbar-none shadow-lg"
        >
          <WidgetRenderer />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={false}
      animate={{ width: isExpanded ? 380 : 0 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-y-auto border-l bg-neutral-50 scrollbar-none"
    >
      <WidgetRenderer />
    </motion.div>
  );
}
