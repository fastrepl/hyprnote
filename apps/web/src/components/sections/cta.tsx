import { CtaButton } from "@/components/ui/cta-button";

export default function CtaSection() {
  return (
    <section className="py-24 bg-primary text-center">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-primary-foreground mb-4">
          Start Typing Now
        </h2>
        <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
          Take notes smarter, faster, and more efficiently
        </p>
        <CtaButton size="xl" />
      </div>
    </section>
  );
}
