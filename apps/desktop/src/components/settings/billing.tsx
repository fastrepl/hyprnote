import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { openUrl } from "@tauri-apps/plugin-opener";
import { Check } from "lucide-react";
import { useCallback, useState } from "react";

export function SettingsBilling() {
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");

  const handlePlanChange = useCallback((nextPlan: PlanId) => {
    setCurrentPlan(nextPlan);
    console.log(`[billing] Requested plan change to ${nextPlan}`);
  }, []);

  const handleContact = useCallback(() => {
    openUrl("https://cal.com/team/hyprnote/welcome");
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 border border-neutral-200 rounded-lg bg-white overflow-hidden">
        <div className="grid grid-cols-2 h-full">
          {PLANS.map((plan, index) => (
            <div
              key={plan.id}
              className={cn([index === 0 && "border-r border-neutral-200"])}
            >
              <BillingPlanCard
                plan={plan}
                currentPlan={currentPlan}
                onChangePlan={handlePlanChange}
                onContactSales={handleContact}
                removeBorder
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BillingPlanCard(
  {
    plan,
    currentPlan,
    onChangePlan,
    onContactSales,
    className,
    removeBorder = false,
  }: {
    plan: BillingPlan;
    currentPlan: PlanId;
    onChangePlan: (plan: PlanId) => void;
    onContactSales: () => void;
    className?: string;
    removeBorder?: boolean;
  },
) {
  const isCurrent = plan.id === currentPlan;

  return (
    <div
      className={cn(
        [
          "h-full p-8 flex flex-col justify-center gap-6 bg-white",
          !removeBorder && "border border-neutral-200 rounded-lg",
          className,
        ],
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="text-sm text-neutral-600">{plan.description}</p>
        </div>

        <ul className="space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-neutral-700">
              <Check size={16} className="mt-0.5 text-emerald-500 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <p className="text-xl font-semibold">
          {plan.price}{" "}
          {plan.priceSuffix && <span className="text-sm text-neutral-500 font-light">{plan.priceSuffix}</span>}
        </p>

        <PlanActions
          planId={plan.id}
          currentPlan={currentPlan}
          onChangePlan={onChangePlan}
          onContactSales={onContactSales}
          isCurrent={isCurrent}
        />
      </div>
    </div>
  );
}

function PlanActions(
  {
    planId,
    currentPlan,
    onChangePlan,
    onContactSales,
    isCurrent,
  }: {
    planId: PlanId;
    currentPlan: PlanId;
    onChangePlan: (plan: PlanId) => void;
    onContactSales: () => void;
    isCurrent: boolean;
  },
) {
  if (isCurrent) {
    return (
      <Button variant="outline" disabled className="w-full">
        Current Plan
      </Button>
    );
  }

  if (planId === "free") {
    return (
      <Button variant="outline" onClick={() => onChangePlan("free")} className="w-full">
        Downgrade to Free
      </Button>
    );
  }

  if (planId === "pro") {
    if (currentPlan === "free") {
      return (
        <Button onClick={() => onChangePlan("pro")} className="w-full">
          Upgrade to Pro
        </Button>
      );
    }

    return (
      <Button variant="outline" onClick={() => onChangePlan("pro")} className="w-full">
        Downgrade to Pro
      </Button>
    );
  }

  return (
    <Button onClick={onContactSales} className="w-full">
      Contact Us
    </Button>
  );
}

type PlanId = "free" | "pro";

interface BillingPlan {
  id: PlanId;
  name: string;
  description: string;
  price: string;
  priceSuffix?: string;
  features: string[];
}

const PLANS: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with local transcription and essential exports.",
    price: "$0",
    priceSuffix: "per month",
    features: [
      "Local transcription with BYOK intelligence",
      "Copy and PDF sharing",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Unlock cloud enhancements and org-ready workflows.",
    price: "$19",
    priceSuffix: "per seat / month",
    features: [
      "Local + cloud transcription",
      "Shareable links with viewer permissions",
      "Unified billing and access controls",
    ],
  },
];
