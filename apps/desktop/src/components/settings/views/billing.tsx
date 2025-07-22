import { ArrowRight, CreditCard, ExternalLink, Shield } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Card } from "@hypr/ui/components/ui/card";
import { Input } from "@hypr/ui/components/ui/input";
import { Label } from "@hypr/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@hypr/ui/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";

export default function Billing() {
  return (
    <BillingSection
      isPro={false}
      onActivateKey={(key) => console.log("Activate:", key)}
      onSubscribe={(email, interval) =>
        console.log("Subscribe:", {
          email,
          interval,
        })}
    />
  );
}

export const BillingSection = ({
  isPro = false,
  currentLicenseKey,
  onActivateKey,
  onDeactivateKey,
  onSubscribe,
  onOpenStripePortal,
  billingCycle,
  nextBillingDate,
}: {
  isPro?: boolean;
  currentLicenseKey?: string;
  onActivateKey?: (key: string) => void;
  onDeactivateKey?: () => void;
  onSubscribe?: (email: string, interval: "monthly" | "yearly") => void;
  onOpenStripePortal?: () => void;
  billingCycle?: string;
  nextBillingDate?: string;
}) => {
  const [licenseKey, setLicenseKey] = useState("");
  const [email, setEmail] = useState("");
  const [interval, setInterval] = useState<"monthly" | "yearly">("yearly");

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/40">
          <div className="flex items-center space-x-4">
            <div className="p-2 rounded-full bg-primary/5">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {isPro ? "Pro Plan" : "Free Plan"}
              </h2>
              {isPro && (
                <p className="text-sm text-muted-foreground mt-1.5">
                  Next charge: {nextBillingDate} • {billingCycle}
                </p>
              )}
            </div>
          </div>
          {isPro && (
            <Button
              variant="outline"
              onClick={onOpenStripePortal}
              className="flex items-center transition-colors hover:bg-primary/5"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Billing Portal
            </Button>
          )}
        </div>
        {isPro
          ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Your License Key</Label>
                <Input
                  type="text"
                  value={currentLicenseKey?.replace(/./g, "•")}
                  disabled
                  className="font-mono bg-muted/50 border-border/40"
                />
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={onDeactivateKey}
                  className="text-destructive hover:text-destructive-foreground hover:bg-destructive transition-colors"
                >
                  Deactivate Device
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  This will allow you to use your license on another device
                </p>
              </div>
            </div>
          )
          : (
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
                    onClick={() => onSubscribe?.(email, interval)}
                    className="w-full transition-colors"
                    disabled={!email}
                  >
                    Continue to Checkout
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
              </TabsContent>
              <TabsContent value="license" className="space-y-6 pt-2">
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Enter your license key"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="font-mono transition-colors focus:border-primary/20"
                  />
                  <Button
                    onClick={() => onActivateKey?.(licenseKey)}
                    className="w-full transition-colors"
                    disabled={!licenseKey}
                  >
                    Activate License
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
      </Card>
    </div>
  );
};
