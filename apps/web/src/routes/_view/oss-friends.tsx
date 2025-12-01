import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";
import { allOssFriends } from "content-collections";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/oss-friends")({
  component: Component,
  head: () => ({
    meta: [
      { title: "OSS Friends - Hyprnote" },
      {
        name: "description",
        content:
          "Discover amazing open source projects and tools built by our friends in the community. Hyprnote is proud to be part of the open source ecosystem.",
      },
      { property: "og:title", content: "OSS Friends - Hyprnote" },
      {
        property: "og:description",
        content:
          "Discover amazing open source projects and tools built by our friends in the community.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/oss-friends",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "OSS Friends - Hyprnote" },
      {
        name: "twitter:description",
        content:
          "Discover amazing open source projects and tools built by our friends in the community.",
      },
    ],
  }),
});

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <SlashSeparator />
        <FriendsSection />
        <SlashSeparator />
        <JoinSection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="px-6 py-12 lg:py-20">
        <header className="mb-8 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
            OSS Friends
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed max-w-3xl mx-auto">
            Discover amazing open source projects and tools built by our friends
            in the community. We believe in the power of open source and are
            proud to be part of this ecosystem.
          </p>
        </header>
      </div>
    </div>
  );
}

function FriendsSection() {
  return (
    <section className="px-6 py-12 lg:py-16">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {allOssFriends.map((friend) => (
          <a
            key={friend.slug}
            href={friend.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn([
              "group flex flex-col border border-neutral-200 rounded-lg bg-white overflow-hidden",
              "hover:border-stone-400 hover:shadow-md transition-all",
            ])}
          >
            <div className="aspect-video bg-neutral-100 overflow-hidden">
              {friend.image ? (
                <img
                  src={friend.image}
                  alt={friend.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon
                    icon="mdi:open-source-initiative"
                    className="text-4xl text-neutral-300"
                  />
                </div>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-lg font-medium text-stone-600 group-hover:text-stone-800">
                  {friend.name}
                </h3>
                <Icon
                  icon="mdi:arrow-top-right"
                  className="text-lg text-neutral-400 group-hover:text-stone-600 transition-colors shrink-0"
                />
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {friend.description}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function JoinSection() {
  return (
    <section className="px-6 py-12 lg:py-16 bg-stone-50/30">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-serif text-stone-600 mb-4">
          Want to be listed?
        </h2>
        <p className="text-neutral-600 mb-6">
          If you're building an open source project and would like to be
          featured on this page, we'd love to hear from you.
        </p>
        <a
          href="https://github.com/fastrepl/hyprnote/issues/new?title=OSS%20Friends%20Request&body=Project%20Name:%0AProject%20URL:%0ADescription:"
          target="_blank"
          rel="noopener noreferrer"
          className={cn([
            "inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium rounded-full",
            "bg-linear-to-t from-neutral-800 to-neutral-700 text-white",
            "hover:scale-105 active:scale-95 transition-transform",
          ])}
        >
          <Icon icon="mdi:github" className="text-lg" />
          Submit your project
        </a>
      </div>
    </section>
  );
}
