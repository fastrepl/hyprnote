"use client";

import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Button } from "@/components/ui/button";
import { RiCheckFill } from "@remixicon/react";
import { cn } from "@/lib/utils";

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

  const billingPlans: BillingPlan[] = [
    {
      type: "Pro",
      level: 1,
      price: {
        monthly: 10,
        yearly: 8,
      },
      features: [
        "Note creation and editing",
        "Unlimited speech recognition",
        "Multi-language support",
        "Offline mode (English)",
        "Advanced AI features",
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
        "All Pro plan features",
        "Team workspace",
        "Detailed access control",
        "Shared note editing permissions",
        "Team billing",
        "Usage dashboard",
      ],
    },
  ];

  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-4">
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
          <Tabs.List className="mx-auto flex w-fit space-x-1 rounded-lg bg-muted p-1 border border-gray-100">
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
              Yearly{" "}
              <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-black border border-gray-300">
                Save 20%
              </span>
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {billingPlans.map((plan) => (
            <div
              key={plan.type}
              className="p-8 rounded-xl relative border border-border"
            >
              <h3 className="text-2xl font-bold flex items-center gap-2">
                {plan.type}
                {plan.type === "Pro" && (
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded">
                    Popular
                  </span>
                )}
              </h3>
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
                className={cn("w-full mb-8", {
                  "cursor-not-allowed": plan.type === "Business",
                })}
                variant="default"
                disabled={plan.type === "Business"}
              >
                {plan.type === "Pro" ? "14-days free trial" : "Coming Soon"}
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
