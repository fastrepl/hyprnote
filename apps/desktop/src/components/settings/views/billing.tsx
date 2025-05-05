import { Trans, useLingui } from "@lingui/react/macro";
import { CheckIcon, ExternalLinkIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@hypr/ui/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";

interface BillingProps {
  currentPlan?: string;
  trialDaysLeft?: number;
}

export default function Billing({ currentPlan, trialDaysLeft }: BillingProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const { t } = useLingui();

  const pricingPlans = [
    {
      name: t`Free`,
      description: t`For those who are serious about their privacy`,
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        t`Works both in-person and remotely`,
        t`Format notes using templates`,
        t`Ask questions about past meetings`,
        t`Live summary of the meeting`,
        t`Works offline`,
      ],
    },
    {
      name: t`Pro`,
      description: t`For those who are serious about their performance`,
      monthlyPrice: 19,
      annualPrice: 15,
      features: [
        t`Integration with other apps like Notion and Google Calendar`,
        t`Long-term memory for past meetings and attendees`,
        t`Much better AI performance`,
        t`Meeting note sharing via links`,
        t`Synchronization across multiple devices`,
      ],
    },
    {
      name: t`Team`,
      description: t`For fast growing teams like energetic startups`,
      monthlyPrice: 25,
      annualPrice: 20,
      features: [
        t`Search & ask across all notes in workspace`,
        t`Collaborate with others in meetings`,
        t`Single sign-on for all users`,
      ],
      isPerSeat: true,
      comingSoon: true,
    },
  ];

  const getButtonText = (planName: string) => {
    const plan = planName.toLowerCase();
    if (plan === "team") {
      return t`Coming Soon`;
    }
    if (currentPlan === plan) {
      return t`Current Plan`;
    }
    if (currentPlan === "basic" && plan === "pro") {
      return t`Upgrade`;
    }
    if (trialDaysLeft && plan === "pro") {
      return t`Free Trial`;
    }
    return billingCycle === "monthly"
      ? t`Start Monthly Plan`
      : t`Start Annual Plan`;
  };

  const getButtonProps = (planName: string) => {
    const plan = planName.toLowerCase();
    if (plan === "team") {
      return {
        disabled: true,
        variant: "outline" as const,
      };
    }
    if (currentPlan === plan) {
      return {
        variant: "outline" as const,
      };
    }
    return {
      variant: "default" as const,
    };
  };

  return (
    <div className="relative h-full">
      <div className="absolute inset-0 backdrop-blur-sm bg-white/50 dark:bg-zinc-900/50 z-10 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
          <Trans>Coming Soon</Trans>
        </div>
        <p className="text-neutral-700 dark:text-neutral-300 max-w-md text-center">
          <Trans>
            Billing features are currently under development and will be available in a future update.
          </Trans>
        </p>
      </div>

      <div className="space-y-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium">
            <Trans>There's a plan for everyone</Trans>
          </p>

          <Tabs
            value={billingCycle}
            onValueChange={(value) => setBillingCycle(value as "monthly" | "annual")}
          >
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger
                value="monthly"
                className="data-[state=active]:bg-neutral-200 data-[state=active]:text-neutral-950 focus:outline-none focus:ring-0"
              >
                <Trans>Monthly</Trans>
              </TabsTrigger>
              <TabsTrigger
                value="annual"
                className="data-[state=active]:bg-neutral-200 data-[state=active]:text-neutral-950 focus:outline-none focus:ring-0"
              >
                <Trans>Annual</Trans>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="w-full space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card key={plan.name} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.name === "Pro" && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                        Best
                      </span>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="mb-4 text-3xl font-bold">
                    $
                    {billingCycle === "monthly"
                      ? plan.monthlyPrice
                      : plan.annualPrice}
                    <span className="text-sm font-normal text-muted-foreground">
                      {plan.isPerSeat ? "/seat" : ""} /month
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                          <CheckIcon className="h-5 w-5 text-green-500" />
                        </div>
                        <span className="ml-2">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col items-center gap-2">
                  <Button className="w-full" {...getButtonProps(plan.name)}>
                    {getButtonText(plan.name)}
                  </Button>
                  {trialDaysLeft && plan.name.toLowerCase() === "pro" && (
                    <p className="text-xs text-muted-foreground">
                      {trialDaysLeft} days left in trial
                    </p>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          {billingCycle === "annual" && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Save up to 20% with annual billing
            </p>
          )}

          <div className="mt-8 text-center">
            <a
              href="https://hyprnote.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-muted-foreground decoration-dotted hover:text-foreground hover:underline"
            >
              <Trans>Learn more about our pricing plans</Trans>
              <ExternalLinkIcon className="ml-1 h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
