import { CtaButton } from "@/components/ui/cta-button";
import Announcement from "../hero/Announcement";
import Demo from "../hero/Demo";
import SparklesText from "../ui/sparkles-text";

export default function Hero() {
  return (
    <section className="pt-32 pb-16 text-center">
      <div className="container mx-auto px-4">
        <Announcement />

        <h1 className="text-5xl font-bold mb-6">Hypercharge Notetaking</h1>

        <p className="text-2xl max-w-2xl mx-auto mb-8 text-gray-800 leading-relaxed">
          <strong className="text-black font-bold font-racing-sans">
            HYPRNOTE
          </strong>{" "}
          is a smart notepad 🗒️
          <br className="hidden sm:block" />
          <span className="inline-flex mt-2 items-center">
            that combines notes with
            <span className="inline-flex ml-2 justify-center items-center gap-2 bg-red-50/80 rounded-full px-3 py-1">
              <span className="size-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="font-medium text-gray-900 text-xl">
                voice recordings
              </span>
            </span>
          </span>
          <br className="hidden sm:block" />
          <span className="inline-block mt-2">
            to create{" "}
            <SparklesText
              text="powerful summaries"
              className="text-2xl inline font-medium"
              colors={{ first: "#FFD700", second: "#1E90FF" }}
            />
          </span>
        </p>

        <CtaButton size="xl" />

        <Demo />
      </div>
    </section>
  );
}
