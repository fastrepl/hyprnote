import trialPolicy from "./trial-policy.json" with { type: "json" };

export const PRO_TRIAL_DAYS = trialPolicy.proTrialDays;
export const WORK_EMAIL_PRO_TRIAL_DAYS = trialPolicy.workEmailProTrialDays;
export const REFERRAL_PRO_TRIAL_DAYS = trialPolicy.referralProTrialDays;

export type ProTrialOffer = "referral" | "work_email" | "personal_email";

export function proTrialDaysForOffer(offer: ProTrialOffer) {
  switch (offer) {
    case "referral":
      return REFERRAL_PRO_TRIAL_DAYS;
    case "work_email":
      return WORK_EMAIL_PRO_TRIAL_DAYS;
    case "personal_email":
      return PRO_TRIAL_DAYS;
  }
}
