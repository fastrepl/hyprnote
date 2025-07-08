import { CheckCircle } from "lucide-react";
import { motion } from "motion/react";

import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { Trans } from "@lingui/react/macro";

interface SetupCompleteViewProps {
  onComplete: () => void;
}

export function SetupCompleteView({ onComplete }: SetupCompleteViewProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-6"
      >
        <CheckCircle className="h-12 w-12 text-neutral-600" />
      </motion.div>

      {/* Success Message */}
      <div className="text-center mb-6 space-y-3">
        <TextAnimate
          animation="fadeIn"
          by="line"
          once
          className="text-xl font-semibold text-foreground"
        >
          You're Ready!
        </TextAnimate>

        <TextAnimate
          animation="fadeIn"
          by="line"
          once
          className="text-sm text-muted-foreground max-w-sm"
        >
          Hyprnote is set up to keep your meetings private and organized.
        </TextAnimate>
      </div>

      {/* Action Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <PushableButton
          onClick={onComplete}
          className="px-6 py-2 bg-black text-white hover:bg-neutral-800 transition-colors rounded-lg font-medium"
        >
          <Trans>Start Using Hyprnote</Trans>
        </PushableButton>
      </motion.div>
    </div>
  );
}
