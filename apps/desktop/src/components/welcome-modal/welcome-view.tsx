import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { Trans, useLingui } from "@lingui/react/macro";
import React from "react";

interface WelcomeViewProps {
  portReady: boolean;
  onGetStarted: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ portReady, onGetStarted }) => {
  const { t } = useLingui();

  return (
    <div className="flex flex-col items-center">
      <img
        src="/assets/logo.svg"
        alt="HYPRNOTE"
        className="mb-6 w-[300px]"
      />

      <TextAnimate
        animation="slideUp"
        by="word"
        once
        className="mb-4 text-center text-2xl font-medium text-neutral-600"
      >
        {t`Where Conversations Stay Yours`}
      </TextAnimate>

      <TextAnimate
        animation="fadeIn"
        by="line"
        once
        className="mb-20 text-center text-lg font-normal text-neutral-500"
      >
        {t`Private. Secure. On-device.`}
      </TextAnimate>

      <PushableButton
        disabled={!portReady}
        onClick={onGetStarted}
        className="w-full max-w-sm"
      >
        <Trans>Get Started</Trans>
      </PushableButton>
    </div>
  );
};
