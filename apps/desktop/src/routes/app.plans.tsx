import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Check } from "lucide-react";

import { useHypr } from "@/contexts";
import { Button } from "@hypr/ui/components/ui/button";
import { ProgressiveBlur } from "@hypr/ui/components/ui/progressive-blur";
import { cn } from "@hypr/ui/lib/utils";

export const Route = createFileRoute("/app/plans")({
  component: Component,
});

function Component() {
  const { subscription } = useHypr();

  const subscriptionInfo = subscription && {
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
    trialEnd: subscription.trial_end,
    price: "$9.99/month - Early Bird Pricing",
  };

  return (
    <div className="flex h-full overflow-hidden bg-gradient-to-b from-background to-background/80">
      <main className="container mx-auto pb-16 px-4 max-w-5xl overflow-hidden">
        <div className="grid grid-cols-2 gap-4">
          <PricingCard
            title="Local"
            description="For local AI enthusiasts"
            buttonText="Current Plan"
            buttonVariant="outline"
            features={[
              "100% private, local data",
              "Distraction-free editor",
              "Full AI model control",
              "Realtime conversation to notes",
              "Customizable with extensions",
              "Chat with your note",
              "Meeting reminders",
              "No cloud required",
            ]}
            className="relative border border-primary/10 shadow-sm hover:shadow-md transition-all duration-300 text-white"
          />

          <PricingCard
            title="Pro"
            description="For professional use and teams"
            buttonText={subscription?.status === "active" ? "Current Plan" : "Upgrade Now"}
            buttonVariant="default"
            features={[
              "All Local features",
              "Premium cloud AI models",
              "Speaker detection",
              "Chat across your workspace",
              "Team sharing & collaboration",
              "Custom storage options",
              "Advanced team features",
              "Priority support",
            ]}
            className="relative text-white border border-primary/30 shadow-lg hover:shadow-xl transition-all duration-300"
            subscriptionInfo={subscriptionInfo}
          />
        </div>
      </main>
    </div>
  );
}

interface PricingCardProps {
  title: string;
  description: string;
  buttonText: string;
  buttonVariant: "default" | "outline";
  features: string[];
  className?: string;
  secondaryAction?: {
    text: string;
    onClick: () => void;
  };
  subscriptionInfo?: {
    status: string;
    currentPeriodEnd: number;
    trialEnd: number | null | undefined;
    price: string;
  };
}

function PricingCard({
  title,
  description,
  buttonText,
  buttonVariant,
  features,
  className,
  secondaryAction,
  subscriptionInfo,
}: PricingCardProps) {
  const isLocalPlan = title === "Local";
  const bgImage = isLocalPlan ? "/assets/bg-local-card.jpg" : "/assets/bg-pro-card.jpg";

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-8 flex flex-col relative overflow-hidden",
        className,
      )}
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {isLocalPlan
        ? <div className="absolute inset-0 bg-black/40 z-0"></div>
        : <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-black/10 z-0"></div>}

      <div className="absolute top-4 right-4 z-10">
        <div
          className={cn(
            "px-3 py-1 rounded-full text-xs font-semibold",
            isLocalPlan
              ? "bg-black/80 text-white"
              : "bg-white/80 text-black",
          )}
        >
          {isLocalPlan ? "Free" : "Public Beta"}
        </div>
      </div>

      <ProgressiveBlur
        className="pointer-events-none absolute bottom-0 left-0 h-[50%] w-full z-5"
        blurIntensity={6}
      />

      {/* Wrapper for content to ensure it's above the blur */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="relative z-10 pt-6">
          <h3 className="text-3xl font-bold text-center mb-2 text-white">{title}</h3>
          <p className="text-center text-white/80 mb-6 text-xl">{description}</p>

          {!isLocalPlan && subscriptionInfo && (
            <div className="bg-white/10 rounded-lg p-3 mb-6 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white/90">Plan Status</p>
                <span
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    subscriptionInfo.status === "active"
                      ? "bg-green-500/20 text-green-300"
                      : subscriptionInfo.status === "trialing"
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-yellow-500/20 text-yellow-300",
                  )}
                >
                  {subscriptionInfo.status === "active"
                    ? "Active"
                    : subscriptionInfo.status === "trialing"
                    ? "Trial"
                    : (subscriptionInfo.status
                      && subscriptionInfo.status.charAt(0).toUpperCase() + subscriptionInfo.status.slice(1))
                      || "Unknown"}
                </span>
              </div>

              {subscriptionInfo.price && (
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-white/90">Price</p>
                  <span className="text-xs text-white/80">{subscriptionInfo.price}</span>
                </div>
              )}

              {subscriptionInfo.trialEnd && (
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-white/90">Trial Ends</p>
                  <div className="flex items-center text-xs text-white/80">
                    <CalendarClock className="h-3 w-3 mr-1" />
                    {formatDate(subscriptionInfo.trialEnd)}
                  </div>
                </div>
              )}

              {subscriptionInfo.currentPeriodEnd && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white/90">Next Billing</p>
                  <div className="flex items-center text-xs text-white/80">
                    <CalendarClock className="h-3 w-3 mr-1" />
                    {formatDate(subscriptionInfo.currentPeriodEnd)}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLocalPlan && !subscriptionInfo && (
            <div className="bg-white/10 rounded-lg p-3 mb-6 border border-white/20">
              <p className="text-center text-sm font-medium text-white/90">$9.99/month - Early Bird Pricing</p>
            </div>
          )}
        </div>

        {secondaryAction && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-sm mb-6"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.text}
          </Button>
        )}

        <div className="space-y-3 mb-8 flex-grow relative z-10 ml-16">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start group">
              <div className="rounded-full p-0.5 bg-primary/20 mr-3 mt-0.5 flex-shrink-0 group-hover:bg-primary/30 transition-colors duration-300">
                <Check className={cn("h-4 w-4", "text-white")} />
              </div>
              <span className="text-sm font-medium">{feature}</span>
            </div>
          ))}
        </div>

        {isLocalPlan
          ? (
            <Button
              variant={buttonVariant}
              size="md"
              className={cn(
                "w-full py-4 text-md font-medium rounded-xl transition-all duration-300 relative z-10 text-center",
                buttonVariant === "default"
                  ? "bg-blue-500 hover:bg-blue-600 shadow-md hover:shadow-lg text-white"
                  : "bg-white/20 hover:bg-white/30 hover:text-white text-white border-white/40",
              )}
            >
              {buttonText}
            </Button>
          )
          : (
            <Button
              variant={buttonVariant}
              size="md"
              className={cn(
                "w-full py-4 text-md font-medium rounded-xl transition-all duration-300 relative z-10 text-center",
                buttonVariant === "default"
                  ? "bg-blue-500 hover:bg-blue-600 shadow-md hover:shadow-lg text-white"
                  : "bg-white/20 hover:bg-white/30 hover:text-white text-white border-white/40",
              )}
            >
              {buttonText}
            </Button>
          )}
      </div>
    </div>
  );
}
