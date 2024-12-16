import Image from "next/image";
import { CtaButton } from "@/components/ui/cta-button";

export default function Hero() {
  return (
    <section className="pt-32 pb-16 text-center">
      <div className="container mx-auto px-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-8">
          <span className="bg-primary w-2 h-2 rounded-full animate-pulse" />
          Now with offline support for English
        </div>

        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Your AI Meeting Assistant
          <span className="text-2xl text-muted-foreground block mt-2">
            that actually understands your conversations
          </span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          HyprNote uses advanced AI to capture every detail of your meetings,
          lectures, and video calls. Get instant summaries, action items, and
          searchable transcripts - all without inviting any bots.
        </p>

        <CtaButton size="xl" />

        <div className="relative mt-16 mb-12">
          <Image
            src="/hero-image.svg"
            alt="HyprNote Interface"
            width={1200}
            height={600}
            className="mx-auto"
            priority
          />
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Trusted by innovative teams at
          </p>
          <div className="flex justify-center items-center gap-12 grayscale opacity-50">
            <span className="text-2xl font-semibold">Stanford</span>
            <span className="text-2xl font-semibold">MIT</span>
            <span className="text-2xl font-semibold">Harvard</span>
          </div>
        </div>
      </div>
    </section>
  );
}
