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
import { cn } from "@/utils";

const pricingPlans = [
  {
    name: "Free",
    description: "For those who are serious about their privacy",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "Works both in-person and remotely",
      "Format notes using templates",
      "Ask questions about past meetings",
      "Live summary of the meeting",
      "Works offline",
    ],
  },
  {
    name: "Pro",
    description: "For those who are serious about their performance",
    monthlyPrice: 19,
    annualPrice: 15,
    features: [
      "Integration with other apps like Notion and Google Calendar",
      "Long-term memory for past meetings and attendees",
      "Much better AI performance",
      "Meeting note sharing via links",
      "Synchronization across multiple devices",
    ],
  },
  {
    name: "Team",
    description: "For fast growing teams like energetic startups",
    monthlyPrice: 25,
    annualPrice: 20,
    features: [
      "Search & ask across all notes in workspace",
      "Collaborate with others in meetings",
      "Single sign-on for all users",
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
        <p className="text-sm font-medium dark:text-neutral-300">
          <Trans>There&apos;s a plan for everyone</Trans>
        </p>

        <Tabs
          value={billingCycle}
          onValueChange={(value) =>
            setBillingCycle(value as "monthly" | "annual")
          }
        >
          <TabsList className="grid w-fit grid-cols-2 dark:bg-neutral-950">
            <TabsTrigger
              value="monthly"
              className={cn(
                "dark:text-neutral-300",
                "data-[state=active]:bg-neutral-200 dark:data-[state=active]:bg-neutral-800",
                "data-[state=active]:text-neutral-950 dark:data-[state=active]:text-neutral-50",
                "hover:bg-neutral-100 focus:outline-none focus:ring-0",
                "dark:hover:bg-neutral-800 dark:hover:text-neutral-300",
              )}
            >
              Monthly
            </TabsTrigger>
            <TabsTrigger
              value="annual"
              className={cn(
                "dark:text-neutral-300",
                "data-[state=active]:bg-neutral-200 dark:data-[state=active]:bg-neutral-800",
                "data-[state=active]:text-neutral-950 dark:data-[state=active]:text-neutral-50",
                "hover:bg-neutral-100 focus:outline-none focus:ring-0",
                "dark:hover:bg-neutral-800 dark:hover:text-neutral-300",
              )}
            >
              Annual
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card key={plan.name} className="flex flex-col dark:bg-neutral-950">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="dark:text-neutral-300">
                    {plan.name}
                  </CardTitle>
                  {plan.name === "Pro" && (
                    <span className="rounded-full bg-primary dark:bg-primary-foreground px-2 py-0.5 text-xs font-medium text-primary-foreground dark:text-primary">
                      Best
                    </span>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow dark:text-neutral-300">
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
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-green-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="ml-2">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-center gap-2 dark:text-neutral-300">
                <Button
                  className="w-full dark:bg-neutral-600 dark:hover:bg-neutral-700"
                  {...getButtonProps(plan.name)}
                >
                  {getButtonText(plan.name)}
                </Button>
                {trialDaysLeft && plan.name.toLowerCase() === "pro" && (
                  <p className="text-xs text-muted-foreground dark:text-neutral-300">
                    {trialDaysLeft} days left in trial
                  </p>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {billingCycle === "annual" && (
          <p className="mt-4 text-center text-sm text-muted-foreground dark:text-neutral-300">
            Save up to 20% with annual billing
          </p>
        )}

        <div className="mt-8 text-center">
          <a
            href="https://hyprnote.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-muted-foreground decoration-dotted hover:text-foreground hover:underline dark:text-neutral-300"
          >
            <Trans>Learn more about our pricing plans</Trans>
            <ExternalLinkIcon className="ml-1 h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
