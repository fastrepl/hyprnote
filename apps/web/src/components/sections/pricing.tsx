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
        // 1. 기본 기능
        "노트 작성 및 편집",
        "영어 음성 인식",
        "기본 AI 기능",
        "2주 무료 체험",
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
        // 2. 고급 기능
        "무제한 음성 인식",
        "다국어 지원",
        "오프라인 모드 (영어)",
        "고급 AI 기능",
        // 3. 협업 기능
        "노트 공유 링크",
        "앱 연동 (노션, 슬랙 등)",
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
        // 1. Pro 기능 포함
        "Pro 플랜의 모든 기능",
        // 2. 팀 기능
        "팀 워크스페이스",
        "상세 접근 권한 설정",
        "공유 노트 수정 권한",
        // 3. 관리 기능
        "팀 단위 결제",
        "사용 현황 대시보드",
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
                  현재 플랜
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
                <span className="text-muted-foreground">/월</span>
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
                  plan.type,
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
