import { CtaButton } from "@/components/ui/cta-button";

export default function CtaSection() {
  return (
    <section className="py-24 bg-primary text-center">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-primary-foreground mb-4">
          Ready to transform your meeting notes?
        </h2>
        <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
          Join thousands of professionals who are already using HyprNote to
          capture and understand their meetings better.
        </p>
        <CtaButton size="xl" />
      </div>
    </section>
  );
}
