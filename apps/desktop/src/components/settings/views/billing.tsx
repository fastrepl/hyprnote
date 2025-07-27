import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowRight, CreditCard, ExternalLink, Shield } from "lucide-react";
import { useEffect, useState } from "react";

import { useBilling } from "@/hooks/use-billing";
import { useLicense } from "@/hooks/use-license";

import { Button } from "@hypr/ui/components/ui/button";
import { Card } from "@hypr/ui/components/ui/card";
import { Input } from "@hypr/ui/components/ui/input";
import { Label } from "@hypr/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@hypr/ui/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";

export default function Billing() {
  const { getLicense } = useLicense();
  const isPro = getLicense.data?.valid === true;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="p-6 sm:p-8">
        {isPro ? <ProSection /> : <FreeSection />}
      </Card>
    </div>
  );
}

function FreeSection() {
  return (
    <SectionContainer title="Free Plan">
      <Tabs defaultValue="subscribe" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 p-1">
          <TabsTrigger value="subscribe" className="text-sm">
            Get Pro Access
          </TabsTrigger>
          <TabsTrigger value="license" className="text-sm">
            Have a License?
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscribe" className="space-y-6 pt-2">
          <FreeSectionCheckout />
        </TabsContent>

        <TabsContent value="license" className="space-y-6 pt-2">
          <FreeSectionActivate />
        </TabsContent>
      </Tabs>
    </SectionContainer>
  );
}

function FreeSectionCheckout() {
  const { checkout } = useBilling();

  const [email, setEmail] = useState("");
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");

  useEffect(() => {
    if (checkout.status === "success") {
      openUrl(checkout.data.url);
    }
  }, [checkout.status]);

  return (
    <div>
      <div className="space-y-5">
        <div className="space-y-2.5">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="transition-colors focus:border-primary/20"
          />
        </div>
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Billing Interval
          </Label>
          <RadioGroup
            value={interval}
            onValueChange={(value) => setInterval(value as "monthly" | "yearly")}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="monthly" id="monthly" />
              <Label
                htmlFor="monthly"
                className="text-sm font-normal cursor-pointer"
              >
                Monthly
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yearly" id="yearly" />
              <Label
                htmlFor="yearly"
                className="text-sm font-normal cursor-pointer"
              >
                Yearly <span className="text-primary">Save 20%</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
      <div className="space-y-4 pt-2">
        <Button
          onClick={() => checkout.mutate({ email, interval })}
          className="w-full transition-colors"
          disabled={!email || checkout.isPending}
        >
          {checkout.isPending ? "Starting Checkout..." : "Continue to Checkout"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <a
          href="/docs/pro"
          className="flex items-center justify-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more about Pro features
          <ExternalLink className="w-3 h-3 ml-1.5" />
        </a>
      </div>
    </div>
  );
}

function FreeSectionActivate() {
  const { activateLicense } = useLicense();

  const [licenseKey, setLicenseKey] = useState("");

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Enter your license key"
        value={licenseKey}
        onChange={(e) => setLicenseKey(e.target.value)}
        className="font-mono transition-colors focus:border-primary/20"
      />
      <Button
        disabled={activateLicense.isPending}
        onClick={() => activateLicense.mutate(licenseKey)}
        className="w-full transition-colors"
      >
        Activate License
      </Button>
    </div>
  );
}

function ProSection() {
  const l = useLicense();

  const { stripeCustomerId, stripeSubscriptionId } = l.getLicense.data?.metadata || {};
  const b = useBilling({ stripe_customer_id: stripeCustomerId, stripe_subscription_id: stripeSubscriptionId });

  const getSubtitle = () => {
    if (!b.info.data) {
      return "...";
    }

    const { price, current_period_end, cancel_at_period_end, status } = b.info.data;

    if (status !== "active") {
      return "Subscription inactive";
    }

    if (cancel_at_period_end) {
      const endDate = new Date(current_period_end * 1000).toLocaleDateString();
      return `Subscription ends on ${endDate}`;
    }

    const interval = price?.recurring?.interval;
    const amount = price?.unit_amount ? (price.unit_amount / 100).toFixed(2) : "0.00";
    const nextChargeDate = new Date(current_period_end * 1000).toLocaleDateString();

    const intervalText = interval === "year" ? "yearly" : interval === "month" ? "monthly" : interval;

    return `$${amount} ${intervalText} • Next charge: ${nextChargeDate}`;
  };

  const headerAction = (
    <Button
      disabled={b.portal.isPending || !b.info.data}
      variant="outline"
      onClick={() => b.portal.mutate({})}
      className="flex items-center transition-colors hover:bg-primary/5"
    >
      <CreditCard className="w-4 h-4 mr-2" />
      Billing Portal
    </Button>
  );

  return (
    <SectionContainer
      title="Pro Plan"
      subtitle={getSubtitle()}
      headerAction={headerAction}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Your License Key</Label>
          <Input
            type="text"
            value={l.getLicense.data?.key?.replace(/./g, "•") || ""}
            disabled
            className="font-mono bg-muted/50 border-border/40"
          />
        </div>
        <div className="pt-2">
          <Button
            variant="outline"
            disabled={l.deactivateLicense.isPending}
            onClick={() => l.deactivateLicense.mutate({})}
            className="text-destructive hover:text-destructive-foreground hover:bg-destructive transition-colors"
          >
            Deactivate Device
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            This will allow you to use your license on another device
          </p>
        </div>
      </div>
    </SectionContainer>
  );
}

function SectionContainer({ title, subtitle, headerAction, children }: {
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/40">
        <div className="flex items-center space-x-4">
          <div className="p-2 rounded-full bg-primary/5">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {headerAction}
      </div>
      {children}
    </>
  );
}
