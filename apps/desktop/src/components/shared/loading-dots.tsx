import { motion } from "motion/react";

export default function LoadingDots() {
  return (
    <div className="flex gap-px">
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          times: [0, 0.2, 1],
        }}
      >
        .
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          times: [0, 0.2, 1],
          delay: 0.2,
        }}
      >
        .
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          times: [0, 0.2, 1],
          delay: 0.4,
        }}
      >
        .
      </motion.span>
    </div>
  );
}
