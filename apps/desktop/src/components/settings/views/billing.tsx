import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowRight, CreditCard, ExternalLink, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

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
  const { getLicense } = useLicense();
  const isPro = getLicense.data?.valid === true;

  return (
    <SectionContainer title="Free Plan">
      <Tabs defaultValue={isPro ? "license" : "subscribe"} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 p-1">
          <TabsTrigger value="subscribe" className="text-sm font-medium" disabled={isPro}>
            Get Pro Access
          </TabsTrigger>
          <TabsTrigger value="license" className="text-sm font-medium">
            Have a License?
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscribe">
          <FreeSectionCheckout />
        </TabsContent>

        <TabsContent value="license">
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
      <div className="space-y-6">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 text-base transition-all duration-200 focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">
            Billing Interval
          </Label>
          <RadioGroup
            value={interval}
            onValueChange={(value) => setInterval(value as "monthly" | "yearly")}
            className="grid grid-cols-2 gap-4"
          >
            <label
              htmlFor="monthly"
              className={`relative flex cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:bg-muted/50 ${
                interval === "monthly"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border/80"
              }`}
            >
              <RadioGroupItem value="monthly" id="monthly" className="sr-only" />
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div
                    className={`h-4 w-4 rounded-full border-2 ${
                      interval === "monthly"
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/50"
                    }`}
                  >
                    {interval === "monthly" && <div className="h-full w-full rounded-full bg-white scale-50" />}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">Monthly</p>
                    <p className="text-xs text-muted-foreground mt-0.5">$35 / mo</p>
                  </div>
                </div>
              </div>
            </label>
            <label
              htmlFor="yearly"
              className={`relative flex cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:bg-muted/50 ${
                interval === "yearly"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border/80"
              }`}
            >
              <RadioGroupItem value="yearly" id="yearly" className="sr-only" />
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div
                    className={`h-4 w-4 rounded-full border-2 ${
                      interval === "yearly"
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/50"
                    }`}
                  >
                    {interval === "yearly" && <div className="h-full w-full rounded-full bg-white scale-50" />}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">Yearly</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="text-primary font-semibold">$179 / yr</span>
                    </p>
                  </div>
                </div>
              </div>
            </label>
          </RadioGroup>
        </div>
      </div>
      <div className="space-y-4 pt-8">
        <Button
          onClick={() => checkout.mutate({ email, interval })}
          className="w-full h-12 text-base font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          disabled={!z.string().email().safeParse(email).success || checkout.isPending}
        >
          {checkout.isPending ? "Starting Checkout..." : "Continue to Checkout"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <a
          href="https://docs.hyprnote.com/pro/what-is-this"
          className="flex items-center justify-center text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 py-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more about Pro features
          <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
        </a>
      </div>
    </div>
  );
}

function FreeSectionActivate() {
  const { activateLicense } = useLicense();

  const [licenseKey, setLicenseKey] = useState("");

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <Label htmlFor="license" className="text-sm font-medium text-foreground">
          License Key
        </Label>
        <Input
          id="license"
          type="text"
          placeholder="Enter your license key"
          value={licenseKey}
          onChange={(e) => setLicenseKey(e.target.value)}
          className="h-11 font-mono text-sm transition-all duration-200 focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
        />
      </div>
      <Button
        disabled={!licenseKey.trim() || activateLicense.isPending}
        onClick={() => activateLicense.mutate(licenseKey)}
        className="w-full h-11 text-base font-medium transition-all duration-200 shadow-sm hover:shadow-md"
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
      return "No subscription information found.";
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
      onClick={() => b.portal.mutate()}
      className="flex items-center transition-all duration-200 hover:bg-primary/5 border-border/60 hover:border-border"
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
        <div className="space-y-2.5">
          <Label className="text-sm font-medium text-foreground">Your License Key</Label>
          <Input
            type="text"
            value={l.getLicense.data?.key?.replace(/./g, "•") || ""}
            disabled
            className="h-11 font-mono text-sm bg-muted/30 border-border/50 cursor-not-allowed"
          />
        </div>
        <div className="pt-2">
          <Button
            variant="outline"
            disabled={l.deactivateLicense.isPending}
            onClick={() => l.deactivateLicense.mutate({})}
            className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-200"
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
      <div className="flex items-center justify-between pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="p-2 rounded-full bg-primary/10 shadow-sm">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
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
