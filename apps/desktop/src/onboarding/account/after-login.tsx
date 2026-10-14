import { Trans } from "@lingui/react/macro";

import { PRO_TRIAL_DAYS, WORK_EMAIL_PRO_TRIAL_DAYS } from "@anlg/pricing";
import { CheckCircle, CircleNotch } from "@anlg/ui/components/icons";

import { OnboardingButton, StepRow } from "../shared";
import { TrialOfferCard } from "./offer-card";
import { type TrialPhase, useTrialFlow } from "./trial";

function formatTrialEnd(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" },
  );
}

function TrialStarted({
  trialPhase,
}: {
  trialPhase: Extract<TrialPhase, { done: unknown }>;
}) {
  const days = trialPhase.trialDays;
  if (!days) {
    return <StepRow status="done" label={<Trans>Pro trial started</Trans>} />;
  }

  const endsOn = formatTrialEnd(days);
  const subtitle =
    trialPhase.offer === "work_email" ? (
      <Trans>Work email bonus · Free until {endsOn}</Trans>
    ) : trialPhase.offer === "referral" ? (
      <Trans>Invite bonus · Free until {endsOn}</Trans>
    ) : (
      <Trans>Free until {endsOn}</Trans>
    );

  return (
    <TrialOfferCard
      days={days}
      icon={
        <CheckCircle className="size-4 text-emerald-600" aria-hidden="true" />
      }
      title={<Trans>Your Pro trial has started</Trans>}
      subtitle={subtitle}
    />
  );
}

function ChooseTrial({
  email,
  onKeep,
  onSwitch,
  isSwitching,
  switchFailed,
}: {
  email: string | undefined;
  onKeep: () => void;
  onSwitch: () => void;
  isSwitching: boolean;
  switchFailed: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-4">
      {email && (
        <StepRow status="done" label={<Trans>Signed in as {email}</Trans>} />
      )}
      <TrialOfferCard
        previousDays={PRO_TRIAL_DAYS}
        days={WORK_EMAIL_PRO_TRIAL_DAYS}
        title={
          <Trans>
            Get {WORK_EMAIL_PRO_TRIAL_DAYS} days instead of {PRO_TRIAL_DAYS}
          </Trans>
        }
        subtitle={<Trans>Switch to your work email for a full month</Trans>}
      />
      <div className="flex flex-row items-center gap-2">
        <OnboardingButton
          onClick={onSwitch}
          disabled={isSwitching}
          className="flex items-center gap-2 disabled:opacity-70"
        >
          {isSwitching ? (
            <CircleNotch className="size-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          <Trans>Use work email</Trans>
        </OnboardingButton>
        <OnboardingButton
          variant="secondary"
          onClick={onKeep}
          disabled={isSwitching}
        >
          <Trans>Keep {PRO_TRIAL_DAYS} days</Trans>
        </OnboardingButton>
      </div>
      {switchFailed && (
        <p className="text-xs text-red-600">
          <Trans>Couldn't switch accounts. Please try again.</Trans>
        </p>
      )}
    </div>
  );
}

function TrialStatusDisplay({ trialPhase }: { trialPhase: TrialPhase }) {
  return (
    <div className="flex flex-col gap-1.5">
      <StepRow status="done" label={<Trans>Signed in</Trans>} />

      {trialPhase === "checking" && (
        <StepRow
          status="active"
          label={<Trans>Checking trial eligibility...</Trans>}
        />
      )}

      {trialPhase === "starting" && (
        <StepRow
          status="active"
          label={<Trans>Starting your trial...</Trans>}
        />
      )}

      {trialPhase === "already-paid" && (
        <StepRow status="done" label={<Trans>You have an active plan</Trans>} />
      )}

      {trialPhase === "already-trialing" && (
        <StepRow status="done" label={<Trans>You're on a Pro trial</Trans>} />
      )}

      {typeof trialPhase === "object" &&
        "done" in trialPhase &&
        trialPhase.done === "not_eligible" && (
          <StepRow
            status="done"
            label={<Trans>Continuing without trial</Trans>}
          />
        )}

      {typeof trialPhase === "object" &&
        "done" in trialPhase &&
        trialPhase.done === "error" && (
          <StepRow
            status="failed"
            label={<Trans>Could not start trial</Trans>}
          />
        )}
    </div>
  );
}

export function AfterLogin({ onContinue }: { onContinue: () => void }) {
  const trial = useTrialFlow(onContinue);
  const { phase } = trial;

  if (phase && typeof phase === "object" && "choose" in phase) {
    return (
      <ChooseTrial
        email={phase.choose.email}
        onKeep={trial.keepPersonalTrial}
        onSwitch={trial.switchToWorkEmail}
        isSwitching={trial.isSwitching}
        switchFailed={trial.switchFailed}
      />
    );
  }

  if (phase && typeof phase === "object" && phase.done === "started") {
    return <TrialStarted trialPhase={phase} />;
  }

  if (phase) {
    return <TrialStatusDisplay trialPhase={phase} />;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-emerald-600">
      <CheckCircle className="size-4" />
      <span>
        <Trans>Signed in</Trans>
      </span>
    </div>
  );
}
