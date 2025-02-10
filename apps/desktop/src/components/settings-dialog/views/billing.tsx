import { Trans } from "@lingui/react/macro";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@hypr/ui/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import { useState } from "react";
import { ExternalLinkIcon } from "lucide-react";

const pricingPlans = [
  {
    name: "Basic",
    description: "For interns and freelancers starting light",
    monthlyPrice: 9,
    annualPrice: 7,
    features: ["Multiple languages", "Recording playback", "Note enhancing"],
  },
  {
    name: "Pro",
    description: "For professionals like sales reps and journalists",
    monthlyPrice: 19,
    annualPrice: 15,
    features: [
      "Chat with note",
      "Live summary",
      "Offline mode",
      "Emotional analysis",
    ],
  },
  {
    name: "Team",
    description: "For fast growing teams like energetic startups",
    monthlyPrice: 25,
    annualPrice: 20,
    features: [
      "Manage notes with teams",
      "Chat within workspace",
      "Integrate with other tools",
    ],
    isPerSeat: true,
    comingSoon: true,
  },
];

interface BillingProps {
  currentPlan?: "basic" | "pro" | null;
  trialDaysLeft?: number;
}

export default function Billing({ currentPlan, trialDaysLeft }: BillingProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );

  const getButtonText = (planName: string) => {
    const plan = planName.toLowerCase();
    if (plan === "team") return "Coming Soon";
    if (currentPlan === plan) return "Current Plan";
    if (currentPlan === "basic" && plan === "pro") return "Upgrade";
    if (trialDaysLeft && plan === "pro") return "Free Trial";
    return billingCycle === "monthly"
      ? "Start Monthly Plan"
      : "Start Annual Plan";
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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium">
          <Trans>There&apos;s a plan for everyone</Trans>
        </p>

        <Tabs
          value={billingCycle}
          onValueChange={(value) =>
            setBillingCycle(value as "monthly" | "annual")
          }
        >
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
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
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="mr-2 h-5 w-5 text-green-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
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
  );
}
