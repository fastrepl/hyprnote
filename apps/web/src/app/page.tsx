import Hero from "@/components/sections/hero";
import HowItWorks from "@/components/sections/how-it-works";
import Features from "@/components/sections/features";
import Pricing from "@/components/sections/pricing";
import CtaSection from "@/components/sections/cta";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <CtaSection />
    </main>
  );
}
