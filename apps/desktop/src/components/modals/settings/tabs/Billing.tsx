import { useState } from "react";

interface BillingPlan {
  type: "Free" | "Pro" | "Business";
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  isComingSoon?: boolean;
}

interface BillingFormData {
  teamSize: number;
  useCase: string;
  budget: string;
}

export function Billing() {
  const [selectedPlan, setSelectedPlan] = useState<"Free" | "Pro" | "Business">(
    "Free",
  );
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [formData, setFormData] = useState<BillingFormData>({
    teamSize: 1,
    useCase: "",
    budget: "",
  });

  const billingPlans: BillingPlan[] = [
    {
      type: "Free",
      price: {
        monthly: 0,
        yearly: 0,
      },
      features: [
        "무제한 로컬 모델 사용",
        "구글 캘린더 연동",
        "자동 노트 생성",
        "추천 링크로 사용 기간 연장",
        "영어만 지원",
      ],
    },
    {
      type: "Pro",
      price: {
        monthly: 10,
        yearly: 96,
      },
      features: [
        "클라우드 호스팅 모델",
        "STT, LLM 모델 선택 가능",
        "노트 공유 링크",
        "노션, 슬랙 등 앱 연동",
        "오프라인 시 로컬 모델 사용",
        "다국어 지원 (한국어, 영어, 일본어, 중국어)",
      ],
    },
    {
      type: "Business",
      price: {
        monthly: 15,
        yearly: 144,
      },
      features: [
        "팀 워크스페이스",
        "상세 접근 권한 설정",
        "공유 노트 수정 권한",
        "팀 단위 결제",
        "Pro 기능 모두 포함",
      ],
      isComingSoon: true,
    },
  ];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 추천 로직 구현
  };

  return (
    <div className="space-y-8">
      {/* Billing Cycle Toggle */}
      <div className="flex justify-center space-x-2 rounded-lg bg-gray-100 p-1">
        <button
          className={`rounded-md px-4 py-2 text-sm ${
            billingCycle === "monthly"
              ? "bg-white shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setBillingCycle("monthly")}
        >
          Monthly
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm ${
            billingCycle === "yearly"
              ? "bg-white shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setBillingCycle("yearly")}
        >
          Yearly (20% off)
        </button>
      </div>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {billingPlans.map((plan) => (
          <div
            key={plan.type}
            className={`rounded-lg border p-4 ${
              selectedPlan === plan.type
                ? "border-blue-500 ring-2 ring-blue-500"
                : "border-gray-200"
            }`}
            onClick={() => !plan.isComingSoon && setSelectedPlan(plan.type)}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{plan.type}</h3>
              {plan.isComingSoon && (
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  Coming Soon
                </span>
              )}
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold">
                ${plan.price[billingCycle === "monthly" ? "monthly" : "yearly"]}
              </span>
              <span className="text-gray-500">
                /{billingCycle === "monthly" ? "월" : "년"}
              </span>
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
            <button
              className={`mt-4 w-full rounded-md px-4 py-2 text-sm font-medium ${
                plan.isComingSoon
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : selectedPlan === plan.type
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-white text-blue-600 hover:bg-blue-50"
              }`}
              disabled={plan.isComingSoon}
            >
              {plan.isComingSoon
                ? "준비중"
                : selectedPlan === plan.type
                  ? "현재 플랜"
                  : "선택하기"}
            </button>
          </div>
        ))}
      </div>

      {/* Pricing Recommendation Form */}
      <div className="mt-12 rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900">요금제 추천받기</h3>
        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              팀 규모
            </label>
            <input
              type="number"
              min="1"
              value={formData.teamSize}
              onChange={(e) =>
                setFormData({ ...formData, teamSize: parseInt(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              주요 사용 목적
            </label>
            <select
              value={formData.useCase}
              onChange={(e) =>
                setFormData({ ...formData, useCase: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">선택해주세요</option>
              <option value="personal">개인 사용</option>
              <option value="team">팀 협업</option>
              <option value="business">비즈니스</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              예산 범위
            </label>
            <select
              value={formData.budget}
              onChange={(e) =>
                setFormData({ ...formData, budget: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">선택해주세요</option>
              <option value="free">무료만 사용</option>
              <option value="low">$10/월 이하</option>
              <option value="medium">$10-15/월</option>
              <option value="high">$15/월 이상</option>
            </select>
          </div>
          <button
            type="submit"
            className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            추천받기
          </button>
        </form>
      </div>
    </div>
  );
}
