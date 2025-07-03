import { Button } from "@hypr/ui/components/ui/button";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { motion } from "motion/react";

interface StoryViewProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const StoryView: React.FC<StoryViewProps> = ({ onComplete, onSkip }) => {
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

      {/* Story text with different styling per line */}
      <div className="max-w-lg text-center space-y-4">
        {/* First line - larger and bold */}
        <TextAnimate
          animation="fadeIn"
          by="line"
          once
          className="text-lg font-medium text-neutral-700"
        >
          Hope you're enjoying Hyprnote.
        </TextAnimate>

        {/* Second line - regular */}
        <TextAnimate
          animation="fadeIn"
          by="line"
          once
          className="text-base text-neutral-600"
        >
          We care about your privacy. No emails, no personal info collected.
        </TextAnimate>

        {/* Third line - regular */}
        <TextAnimate
          animation="fadeIn"
          by="line"
          once
          className="text-base text-neutral-600"
        >
          But we do want to know how we can make it better for you.
        </TextAnimate>

        {/* Last line - larger and bold */}
        <TextAnimate
          animation="fadeIn"
          by="line"
          once
          className="text-lg font-medium text-neutral-700"
        >
          Mind telling us what you're using Hyprnote for?
        </TextAnimate>
      </div>

      {/* Action buttons - appear after text animation */}
      <motion.div
        className="mt-12 flex gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <Button
          onClick={onSkip}
          variant="ghost"
          className="px-6 py-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          No thanks
        </Button>

        <PushableButton
          onClick={onComplete}
          className="px-8 py-3 bg-black text-white hover:bg-neutral-800 transition-colors rounded-lg font-medium"
        >
          Yes, sure
        </PushableButton>
      </motion.div>
    </div>
  );
};
