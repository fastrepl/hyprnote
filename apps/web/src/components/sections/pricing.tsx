"use client";

import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Button } from "@/components/ui/button";
import { RiCheckFill } from "@remixicon/react";

interface BillingPlan {
  type: "Free" | "Pro" | "Business";
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  isComingSoon?: boolean;
  level: number;
}

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [currentPlan, setCurrentPlan] = useState<"Free" | "Pro" | "Business">(
    "Free"
  );
  const [daysLeft, setDaysLeft] = useState(14); // Remaining free trial days

  const billingPlans: BillingPlan[] = [
    {
      type: "Free",
      level: 0,
      price: {
        monthly: 0,
        yearly: 0,
      },
      features: [
        // 1. Basic features
        "Note creation and editing",
        "English speech recognition",
        "Basic AI features",
        "2-week free trial",
      ],
    },
    {
      type: "Pro",
      level: 1,
      price: {
        monthly: 10,
        yearly: 8,
      },
      features: [
        // 2. Advanced features
        "Unlimited speech recognition",
        "Multi-language support",
        "Offline mode (English)",
        "Advanced AI features",
        // 3. Collaboration features
        "Note sharing links",
        "App integrations (Notion, Slack, etc.)",
      ],
    },
    {
      type: "Business",
      level: 2,
      price: {
        monthly: 15,
        yearly: 12,
      },
      features: [
        // 1. Including Pro features
        "All Pro plan features",
        // 2. Team features
        "Team workspace",
        "Detailed access control",
        "Shared note editing permissions",
        // 3. Management features
        "Team billing",
        "Usage dashboard",
      ],
      isComingSoon: true,
    },
  ];

  const getButtonText = (
    planLevel: number,
    currentLevel: number,
    planType: "Free" | "Pro" | "Business"
  ) => {
    if (planType === "Free" && currentPlan === "Free") {
      if (daysLeft > 0) {
        return `${daysLeft} days left`;
      }
      return "Trial expired";
    }
    if (planLevel === currentLevel) return "Current plan";
    return planLevel > currentLevel ? "Upgrade" : "Downgrade";
  };

  const getPlanLevel = (planType: "Free" | "Pro" | "Business") => {
    return billingPlans.find((plan) => plan.type === planType)?.level || 0;
  };

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground">
            Choose the plan that's right for you
          </p>
        </div>

        <Tabs.Root
          value={billingCycle}
          onValueChange={(value) =>
            setBillingCycle(value as "monthly" | "yearly")
          }
          className="mb-8"
        >
          <Tabs.List className="mx-auto flex w-fit space-x-1 rounded-lg bg-muted p-1">
            <Tabs.Trigger
              value="monthly"
              className="rounded-md px-4 py-2 text-sm data-[state=active]:bg-background data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-sm data-[state=inactive]:hover:text-foreground"
            >
              Monthly
            </Tabs.Trigger>
            <Tabs.Trigger
              value="yearly"
              className="rounded-md px-4 py-2 text-sm data-[state=active]:bg-background data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-sm data-[state=inactive]:hover:text-foreground"
            >
              Yearly (20% off)
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {billingPlans.map((plan) => (
            <div
              key={plan.type}
              className={`p-8 rounded-xl ${
                currentPlan === plan.type
                  ? "border-2 border-primary shadow-lg"
                  : "border border-border"
              }`}
            >
              {plan.isComingSoon && (
                <span className="inline-block bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full mb-4">
                  Coming Soon
                </span>
              )}
              {currentPlan === plan.type && !plan.isComingSoon && (
                <span className="inline-block bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full mb-4">
                  Current Plan
                </span>
              )}

              <h3 className="text-2xl font-bold">{plan.type}</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold">
                  $
                  {
                    plan.price[
                      billingCycle === "monthly" ? "monthly" : "yearly"
                    ]
                  }
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <Button
                className="w-full mb-8"
                variant={currentPlan === plan.type ? "outline" : "default"}
                disabled={
                  currentPlan === plan.type &&
                  (plan.type !== "Free" || daysLeft > 0)
                }
              >
                {getButtonText(
                  plan.level,
                  getPlanLevel(currentPlan),
                  plan.type
                )}
              </Button>

              <ul className="space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2">
                    <RiCheckFill className="w-5 h-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
