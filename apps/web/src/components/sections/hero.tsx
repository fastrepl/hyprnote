import Image from "next/image";
import { CtaButton } from "@/components/ui/cta-button";
import Announcement from "../hero/Announcement";
import Demo from "../hero/Demo";

export default function Hero() {
  return (
    <section className="pt-32 pb-16 text-center">
      <div className="container mx-auto px-4">
        <Announcement />

        <h1 className="text-5xl font-bold mb-6">Hypercharge Notetaking</h1>

        <p className="text-2xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Hypnote is a smart notepad that upgrades your notes by automatically
          transcribing and analyzing the conversation
        </p>

        <CtaButton size="xl" />

        <Demo />
      </div>
    </section>
  );
}
