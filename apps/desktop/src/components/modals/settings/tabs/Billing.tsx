import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";

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

export function Billing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [currentPlan, setCurrentPlan] = useState<"Free" | "Pro" | "Business">(
    "Free",
  );
  const [daysLeft, setDaysLeft] = useState(14); // 남은 무료 사용 기간 (일)

  const billingPlans: BillingPlan[] = [
    {
      type: "Free",
      level: 0,
      price: {
        monthly: 0,
        yearly: 0,
      },
      features: [
        "2주 무료 체험",
        "다중 언어 가능",
        "캘린더 연동",
        "자동 노트 생성",
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
        "로컬 모델로 오프라인 사용",
        "STT, LLM 모델 선택 가능",
        "노트 공유 링크",
        "노션, 슬랙 등 앱 연동",
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
        "팀 워크스페이스",
        "상세 접근 권한 설정",
        "공유 노트 수정 권한",
        "팀 단위 결제",
      ],
      isComingSoon: true,
    },
  ];

  const getButtonText = (
    planLevel: number,
    currentLevel: number,
    planType: "Free" | "Pro" | "Business",
  ) => {
    if (planType === "Free" && currentPlan === "Free") {
      if (daysLeft > 0) {
        return `${daysLeft}일 남음`;
      }
      return "기간 만료";
    }
    if (planLevel === currentLevel) return "사용중";
    return planLevel > currentLevel ? "업그레이드" : "다운그레이드";
  };

  const getPlanLevel = (planType: "Free" | "Pro" | "Business") => {
    return billingPlans.find((plan) => plan.type === planType)?.level || 0;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">결제</h3>
        <p className="mt-1 text-sm text-gray-500">
          구독 및 결제 정보를 관리하세요
        </p>
      </div>

      <div className="h-px bg-gray-200" />

      <Tabs.Root
        value={billingCycle}
        onValueChange={(value) =>
          setBillingCycle(value as "monthly" | "yearly")
        }
      >
        <Tabs.List className="mx-auto flex w-fit space-x-1 rounded-lg bg-gray-100 p-1">
          <Tabs.Trigger
            value="monthly"
            className="rounded-md px-4 py-2 text-sm data-[state=active]:bg-white data-[state=inactive]:text-gray-500 data-[state=active]:shadow-sm data-[state=inactive]:hover:text-gray-700"
          >
            Monthly
          </Tabs.Trigger>
          <Tabs.Trigger
            value="yearly"
            className="rounded-md px-4 py-2 text-sm data-[state=active]:bg-white data-[state=inactive]:text-gray-500 data-[state=active]:shadow-sm data-[state=inactive]:hover:text-gray-700"
          >
            Yearly (20% off)
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {billingPlans.map((plan) => (
          <div
            key={plan.type}
            className={`relative rounded-lg border border-gray-200 p-4 ${currentPlan === plan.type ? "bg-blue-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{plan.type}</h3>
            </div>
            {plan.isComingSoon && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gray-500 px-3 py-0.5 text-xs text-white">
                Coming Soon
              </div>
            )}
            {currentPlan === plan.type && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-0.5 text-xs text-white">
                현재 플랜
              </div>
            )}
            <div className="mt-4">
              <span className="text-2xl font-bold">
                ${plan.price[billingCycle === "monthly" ? "monthly" : "yearly"]}
              </span>
              <span className="text-gray-500">/월</span>
            </div>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <svg
                    className="mr-2 h-4 w-4 text-blue-500"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            {!plan.isComingSoon && (
              <button
                className={`mt-6 w-full rounded-md px-4 py-2 text-sm font-medium ${
                  currentPlan === plan.type
                    ? plan.type === "Free" && daysLeft <= 0
                      ? "border border-red-600 bg-red-100 text-red-600"
                      : "border border-gray-300 bg-gray-100 text-gray-600"
                    : "border border-blue-500 bg-blue-500 text-white hover:bg-blue-600"
                }`}
                disabled={
                  currentPlan === plan.type &&
                  (plan.type !== "Free" || daysLeft > 0)
                }
              >
                {getButtonText(
                  plan.level,
                  getPlanLevel(currentPlan),
                  plan.type,
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
