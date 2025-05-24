import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Check } from "lucide-react";

import { useHypr } from "@/contexts";
import { type Subscription } from "@hypr/plugin-membership";
import { Button } from "@hypr/ui/components/ui/button";
import { ProgressiveBlur } from "@hypr/ui/components/ui/progressive-blur";
import { cn } from "@hypr/ui/lib/utils";

export const Route = createFileRoute("/app/plans")({
  component: Component,
});

function Component() {
  const { subscription } = useHypr();

  if (!subscription) {
    return <RenderInactive />;
  }

  const { status, trial_end } = subscription;
  const isActive = ["active", "trialing"].includes(status);

  if (!isActive) {
    return <RenderInactive />;
  }

  return trial_end
    ? <RenderActiveWithTrial subscription={subscription} />
    : <RenderActiveWithoutTrial subscription={subscription} />;
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
  isActive?: boolean;
  subscriptionInfo?: React.ReactNode;
}

function PricingCard({
  title,
  description,
  buttonText,
  buttonVariant,
  features,
  className,
  secondaryAction,
  isActive = false,
  subscriptionInfo,
}: PricingCardProps) {
  const isLocalPlan = title === "Local";
  const bgImage = isLocalPlan ? "/assets/bg-local-card.jpg" : "/assets/bg-pro-card.jpg";

  return (
    <div
      className={cn(
        "rounded-2xl p-6 flex flex-col relative overflow-hidden",
        className,
        isActive && "ring-2 ring-primary ring-offset-2",
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

        {isActive && (
          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/80 text-white mt-2">
            Active
          </div>
        )}
      </div>

      <ProgressiveBlur
        className="pointer-events-none absolute bottom-0 left-0 h-[50%] w-full"
        blurIntensity={6}
      />

      {/* Wrapper for content to ensure it's above the blur */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="relative z-10 pt-4">
          <h3 className="text-2xl font-bold text-center mb-1 text-white">{title}</h3>
          <p className="text-center text-white/80 mb-4 text-lg">{description}</p>
          {subscriptionInfo}
        </div>

        {secondaryAction && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-sm mb-4"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.text}
          </Button>
        )}

        <div className="space-y-2 mb-6 flex-grow relative z-10 ml-12">
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
                "w-full py-3 text-md font-medium rounded-xl transition-all duration-300 relative z-10 text-center",
                buttonVariant === "default"
                  ? "bg-blue-500 hover:bg-blue-600 shadow-md hover:shadow-lg text-white"
                  : "bg-white/20 hover:bg-white/30 hover:text-white text-white border-white/40",
              )}
              disabled={isActive}
            >
              {isActive ? "Current Plan" : buttonText}
            </Button>
          )
          : (
            <>
              {!isActive
                ? (
                  <div className="flex flex-col space-y-2">
                    <a
                      href="https://hyprnote.com/pro?source=APP"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "block w-full py-3 text-md font-medium rounded-xl transition-all duration-300 relative z-10 text-center",
                        "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md",
                      )}
                    >
                      Upgrade to Pro
                    </a>
                    <div className="rounded-xl bg-white/20 backdrop-blur-sm py-1 px-2">
                      <p className="text-white text-center text-sm font-medium">
                        7-day free trial. No credit card required.
                      </p>
                    </div>
                  </div>
                )
                : (
                  <Button
                    variant={buttonVariant}
                    size="md"
                    className={cn(
                      "w-full py-3 text-md font-medium rounded-xl transition-all duration-300 relative z-10 text-center",
                      "bg-primary/80 hover:bg-primary/90 text-white",
                    )}
                    disabled={true}
                  >
                    Current Plan
                  </Button>
                )}
            </>
          )}
      </div>
    </div>
  );
}

function RenderActiveWithoutTrial({ subscription }: { subscription: Subscription }) {
  const nextBillingDate = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  return (
    <div className="flex h-full overflow-hidden bg-gradient-to-b from-background to-background/80">
      <main className="container mx-auto pb-8 px-4 max-w-5xl overflow-hidden h-full flex items-center">
        <div className="grid grid-cols-2 gap-4 w-full">
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
            className="relative border border-primary/10 shadow-sm hover:shadow-md transition-all duration-300 text-white h-full"
            isActive={!subscription.price_id}
          />

          <PricingCard
            title="Pro"
            description="For professional use and teams"
            buttonText="Upgrade to Pro"
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
            className="relative text-white border border-primary/30 shadow-lg hover:shadow-xl transition-all duration-300 h-full"
            isActive={!!subscription.price_id}
            subscriptionInfo={nextBillingDate && (
              <div className="text-center text-white/90 text-sm">
                <p>Next billing: {format(nextBillingDate, "MMMM dd, yyyy")}</p>
              </div>
            )}
          />
        </div>
      </main>
    </div>
  );
}

function RenderActiveWithTrial({ subscription }: { subscription: Subscription }) {
  const trialEndDate = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  return (
    <div className="flex h-full overflow-hidden bg-gradient-to-b from-background to-background/80">
      <main className="container mx-auto pb-8 px-4 max-w-5xl overflow-hidden h-full flex items-center">
        <div className="grid grid-cols-2 gap-4 w-full">
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
            className="relative border border-primary/10 shadow-sm hover:shadow-md transition-all duration-300 text-white h-full"
            isActive={!subscription.price_id}
          />

          <PricingCard
            title="Pro"
            description="For professional use and teams"
            buttonText="Upgrade to Pro"
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
            className="relative text-white border border-primary/30 shadow-lg hover:shadow-xl transition-all duration-300 h-full"
            isActive={!!subscription.price_id}
            subscriptionInfo={trialEndDate && (
              <div className="text-center text-white/90 text-sm">
                <p className="font-semibold">Trial ends: {format(trialEndDate, "MMMM dd, yyyy")}</p>
              </div>
            )}
          />
        </div>
      </main>
    </div>
  );
}

function RenderInactive() {
  return (
    <div className="flex h-full overflow-hidden bg-gradient-to-b from-background to-background/80">
      <main className="container mx-auto pb-8 px-4 max-w-5xl overflow-hidden h-full flex items-center">
        <div className="grid grid-cols-2 gap-4 w-full">
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
            className="relative border border-primary/10 shadow-sm hover:shadow-md transition-all duration-300 text-white h-full"
            isActive={true}
          />

          <PricingCard
            title="Pro"
            description="For professional use and teams"
            buttonText="Upgrade to Pro"
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
            className="relative text-white border border-primary/30 shadow-lg hover:shadow-xl transition-all duration-300 h-full"
            isActive={false}
          />
        </div>
      </main>
    </div>
  );
}
