import { createFileRoute, notFound } from "@tanstack/react-router";
import { allVs } from "content-collections";
import { useRef, useState } from "react";

import { cn } from "@hypr/utils";

import { GitHubOpenSource } from "@/components/github-open-source";
import { SlashSeparator } from "@/components/slash-separator";
import {
  CoolStuffSection,
  CTASection,
  DetailsSection,
  HowItWorksSection,
  MainFeaturesSection,
} from "@/routes/_view/index";

export const Route = createFileRoute("/_view/vs/$slug")({
  component: Component,
  loader: async ({ params }) => {
    const doc = allVs.find((doc) => doc.slug === params.slug);
    if (!doc) {
      throw notFound();
    }

    return { doc };
  },
  head: ({ loaderData }) => {
    const { doc } = loaderData!;
    const metaTitle = `Hyprnote vs ${doc.name} - Privacy-First AI Notetaking`;

    return {
      meta: [
        { title: metaTitle },
        { name: "description", content: doc.metaDescription },
        { property: "og:title", content: metaTitle },
        { property: "og:description", content: doc.metaDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://hyprnote.com/vs/${doc.slug}` },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: metaTitle },
        { name: "twitter:description", content: doc.metaDescription },
      ],
    };
  },
});

function Component() {
  const { doc } = Route.useLoaderData();
  const [selectedDetail, setSelectedDetail] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState(0);
  const detailsScrollRef = useRef<HTMLDivElement>(null);
  const featuresScrollRef = useRef<HTMLDivElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const scrollToDetail = (index: number) => {
    setSelectedDetail(index);
    if (detailsScrollRef.current) {
      const container = detailsScrollRef.current;
      const scrollLeft = container.offsetWidth * index;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  };

  const scrollToFeature = (index: number) => {
    setSelectedFeature(index);
    if (featuresScrollRef.current) {
      const container = featuresScrollRef.current;
      const scrollLeft = container.offsetWidth * index;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  };

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection
          competitorIcon={doc.icon}
          competitorName={doc.name}
          headline={doc.headline}
          description={doc.description}
        />
        <SlashSeparator />
        <HowItWorksSection />
        <SlashSeparator />
        <CoolStuffSection />
        <SlashSeparator />
        <MainFeaturesSection
          featuresScrollRef={featuresScrollRef}
          selectedFeature={selectedFeature}
          setSelectedFeature={setSelectedFeature}
          scrollToFeature={scrollToFeature}
        />
        <SlashSeparator />
        <DetailsSection
          detailsScrollRef={detailsScrollRef}
          selectedDetail={selectedDetail}
          setSelectedDetail={setSelectedDetail}
          scrollToDetail={scrollToDetail}
        />
        <SlashSeparator />
        <GitHubOpenSource />
        <SlashSeparator />
        <CTASection heroInputRef={heroInputRef} />
      </div>
    </div>
  );
}

function HeroSection({
  competitorIcon,
  competitorName,
  headline,
  description,
}: {
  competitorIcon: string;
  competitorName: string;
  headline: string;
  description: string;
}) {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 px-6 py-12 lg:py-20">
      <header className="text-center max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-12">
          <div className="size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent opacity-30">
            <img
              src={competitorIcon}
              alt={competitorName}
              className="size-36 rounded-[40px] border border-neutral-100"
            />
          </div>
          <div className="text-3xl sm:text-4xl text-neutral-400 font-light pl-6 pr-8">
            vs
          </div>
          <div className="size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent scale-110">
            <img
              src="/api/images/hyprnote/icon.png"
              alt="Hyprnote"
              className="size-36 rounded-[40px] border border-neutral-100"
            />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-stone-600 mb-6">
          {headline}
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600 mb-8">
          {description}
        </p>

        <div className="mt-8">
          <a
            href="https://hyprnote.com/download"
            className={cn([
              "inline-block px-8 py-3 text-base font-medium rounded-full",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "hover:scale-105 active:scale-95 transition-transform",
            ])}
          >
            Download Hyprnote for free
          </a>
        </div>
      </header>
    </div>
  );
}
