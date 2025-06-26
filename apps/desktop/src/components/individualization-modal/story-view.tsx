import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { Trans, useLingui } from "@lingui/react/macro";
import { useEffect } from "react";
import { motion } from "motion/react";

interface StoryViewProps {
  onComplete: () => void;
}

export const StoryView: React.FC<StoryViewProps> = ({ onComplete }) => {
  const { t } = useLingui();

  // Auto-advance after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4500); // 4.5 seconds total

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px]">
      {/* Logo with entrance animation */}
      <motion.img
        src="/assets/logo.svg"
        alt="HYPRNOTE"
        className="mb-8 w-[120px]"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />

      {/* Main story text with staggered animation */}
      <div className="max-w-md text-center space-y-6">
        <TextAnimate
          animation="slideUp"
          by="word"
          once
          className="text-lg font-medium text-neutral-700"
          delay={0.8}
        >
          {t`We believe every meeting matters`}
        </TextAnimate>

        <TextAnimate
          animation="slideUp"
          by="word"
          once
          className="text-base text-neutral-600"
          delay={1.8}
        >
          {t`Your workflow is unique, and so should be your AI companion`}
        </TextAnimate>

        <TextAnimate
          animation="slideUp"
          by="word"
          once
          className="text-sm text-neutral-500"
          delay={2.8}
        >
          {t`Let us personalize Hyprnote just for you`}
        </TextAnimate>
      </div>

      {/* Subtle loading indicator */}
      <motion.div
        className="mt-12 flex space-x-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-neutral-400 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};
