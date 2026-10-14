import { Trans } from "@lingui/react/macro";
import { useState } from "react";

import { PRO_TRIAL_DAYS, WORK_EMAIL_PRO_TRIAL_DAYS } from "@anlg/pricing";
import { CircleNotch } from "@anlg/ui/components/icons";

import { OnboardingButton } from "../shared";
import { TrialOfferCard } from "./offer-card";

import { useAuth } from "~/auth";

export function BeforeLogin() {
  const auth = useAuth();
  const [isOpening, setIsOpening] = useState(false);

  const handleSignIn = () => {
    if (isOpening) return;
    setIsOpening(true);
    void auth.signIn().finally(() => setIsOpening(false));
  };

  return (
    <div className="flex flex-col items-start gap-4">
      <TrialOfferCard
        days={WORK_EMAIL_PRO_TRIAL_DAYS}
        title={<Trans>Pro, free for a month</Trans>}
        subtitle={<Trans>Sign up with your work email</Trans>}
        badge={<Trans>Personal email · {PRO_TRIAL_DAYS} days</Trans>}
      />
      <div className="flex flex-row items-center gap-4">
        <OnboardingButton
          onClick={handleSignIn}
          disabled={isOpening}
          className="flex items-center gap-2 px-6 py-2 text-sm disabled:opacity-70"
        >
          {isOpening ? (
            <CircleNotch className="size-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          <Trans>Get started</Trans>
        </OnboardingButton>
      </div>
    </div>
  );
}
