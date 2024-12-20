import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useTranslation } from "react-i18next";

interface BillingPlan {
  type: "Pro" | "Business";
  price: {
    monthly: number;
    yearly: number;
  };
  level: number;
  features: string[];
  isComingSoon?: boolean;
}

export function Billing() {
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [currentPlan, _setCurrentPlan] = useState<"Pro" | "Business">("Pro");
  const [daysLeft, _setDaysLeft] = useState(14);

  const billingPlans: BillingPlan[] = [
    {
      type: "Pro",
      level: 1,
      price: {
        monthly: 10,
        yearly: 8,
      },
      features: [
        t("settings.billing.plans.pro.features.noteCreation"),
        t("settings.billing.plans.pro.features.speechRecognition"),
        t("settings.billing.plans.pro.features.multiLanguage"),
        t("settings.billing.plans.pro.features.offlineMode"),
        t("settings.billing.plans.pro.features.aiFeatures"),
        t("settings.billing.plans.pro.features.sharing"),
        t("settings.billing.plans.pro.features.integrations"),
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
        t("settings.billing.plans.business.features.allPro"),
        t("settings.billing.plans.business.features.workspace"),
        t("settings.billing.plans.business.features.accessControl"),
        t("settings.billing.plans.business.features.sharedEditing"),
        t("settings.billing.plans.business.features.teamBilling"),
        t("settings.billing.plans.business.features.dashboard"),
      ],
      isComingSoon: true,
    },
  ];

  const getButtonText = (planLevel: number, currentLevel: number) => {
    if (daysLeft > 0) {
      return t("settings.billing.status.daysLeft", { days: daysLeft });
    }
    if (planLevel === currentLevel) return t("settings.billing.status.current");
    return planLevel > currentLevel
      ? t("settings.billing.status.upgrade")
      : t("settings.billing.status.downgrade");
  };

  const getPlanLevel = (planType: "Pro" | "Business") => {
    return billingPlans.find((plan) => plan.type === planType)?.level || 1;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          {t("settings.billing.title")}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {t("settings.billing.description")}
        </p>
      </div>

      <div className="h-px bg-gray-200" />

      <Tabs.Root
        value={billingCycle}
        onValueChange={(value) =>
          setBillingCycle(value as "monthly" | "yearly")
        }
        className="flex items-center justify-center"
      >
        <Tabs.List className="inline-flex rounded-lg bg-gray-100 p-1">
          <Tabs.Trigger
            value="monthly"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              billingCycle === "monthly"
                ? "bg-white text-gray-900 shadow"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {t("settings.billing.billingCycle.monthly")}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="yearly"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              billingCycle === "yearly"
                ? "bg-white text-gray-900 shadow"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {t("settings.billing.billingCycle.yearly")}
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {billingPlans.map((plan) => (
          <div
            key={plan.type}
            className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {t(`settings.billing.plans.${plan.type.toLowerCase()}.title`)}
              </h3>
            </div>
            {currentPlan === plan.type && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-0.5 text-xs text-white">
                {t("settings.billing.status.current")}
              </div>
            )}

            <div className="mt-4">
              <span className="text-2xl font-bold">
                ${plan.price[billingCycle === "monthly" ? "monthly" : "yearly"]}
              </span>
              <span className="text-gray-500">
                {t("settings.billing.pricing.perMonth")}
              </span>
            </div>

            <button
              className={`mt-6 w-full rounded-md px-4 py-2 text-sm font-medium ${
                plan.isComingSoon
                  ? "border border-gray-300 bg-gray-100 text-gray-600"
                  : currentPlan === plan.type
                    ? "border border-gray-300 bg-gray-100 text-gray-600"
                    : "border border-blue-500 bg-blue-500 text-white hover:bg-blue-600"
              }`}
              disabled={currentPlan === plan.type || plan.isComingSoon}
            >
              {plan.isComingSoon
                ? t("settings.billing.status.comingSoon")
                : getButtonText(plan.level, getPlanLevel(currentPlan))}
            </button>

            <ul className="mt-4 space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <svg
                    className="mr-3 h-5 w-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
