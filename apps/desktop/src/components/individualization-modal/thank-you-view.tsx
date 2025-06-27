import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { motion } from "motion/react";

interface ThankYouViewProps {
  onContinue: () => void;
}

export const ThankYouView: React.FC<ThankYouViewProps> = ({ onContinue }) => {
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

      {/* Thank you message */}
      <div className="max-w-md text-center space-y-6">
        <TextAnimate
          animation="fadeIn"
          by="line"
          once
          className="text-2xl font-semibold text-neutral-800"
          delay={0.3}
        >
          Thank you! We really mean it.
        </TextAnimate>

        <TextAnimate
          animation="fadeIn"
          by="line"
          once
          className="text-base text-neutral-600"
          delay={0.8}
        >
          We will always be here to make your experience better.
        </TextAnimate>

        <TextAnimate
          animation="fadeIn"
          by="line"
          once
          className="text-sm text-neutral-500"
          delay={1.3}
        >
          Now let's get back to taking amazing notes!
        </TextAnimate>
      </div>

      {/* Continue button */}
      <motion.div
        className="mt-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <PushableButton
          onClick={onContinue}
          className="px-8 py-3 bg-black text-white hover:bg-neutral-800 transition-colors rounded-lg font-medium"
        >
          Continue
        </PushableButton>
      </motion.div>
    </div>
  );
};
