import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { usePlatform } from "@/hooks/use-platform";

export const Route = createFileRoute("/_view/product/memory")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Memory - Hyprnote" },
      {
        name: "description",
        content:
          "Your memory layer that connects all your meetings and conversations. Coming soon.",
      },
    ],
  }),
});

function Component() {
  const platform = usePlatform();

  const getPrimaryCTA = () => {
    if (platform === "mac") {
      return {
        labelFull: "Download for Mac",
        labelShort: "Download",
        href: "/download/apple-silicon",
        isDownload: true,
      };
    }
    return {
      labelFull: platform === "mobile" ? "Remind Me" : "Join Waitlist",
      labelShort: platform === "mobile" ? "Remind Me" : "Join Waitlist",
      href: "/",
      isDownload: false,
    };
  };

  const primaryCTA = getPrimaryCTA();

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white sm:h-[calc(100vh-65px)] overflow-hidden"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white h-full relative flex flex-col">
        <div className="flex-1 bg-[linear-gradient(to_bottom,rgba(245,245,244,0.2),white_50%,rgba(245,245,244,0.3))] px-6 py-12 flex items-center justify-center relative z-10">
          <div className="text-center max-w-4xl mx-auto pointer-events-auto">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6 max-w-2xl mx-auto flex items-center justify-center flex-wrap">
              <span>Your</span>
              <Icon
                icon="mdi:brain"
                className="w-12 h-12 sm:w-16 sm:h-16 inline-block mx-2 text-stone-500"
              />
              <span>memory layer</span>
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
              Hyprnote connects all your meetings and conversations. The more
              you use it, the more it knows about you, your team, and your work.
            </p>

            <div className="mb-8 flex justify-center">
              <div
                className={cn([
                  "inline-block px-6 py-2 text-sm font-medium rounded-full",
                  "bg-linear-to-t from-amber-500 to-amber-400 text-white",
                  "shadow-md",
                ])}
              >
                Coming Soon
              </div>
            </div>

            <div className="flex flex-row gap-4 justify-center items-center">
              {primaryCTA.isDownload ? (
                <a
                  href={primaryCTA.href}
                  download
                  className={cn([
                    "inline-block px-8 py-3 text-base font-medium rounded-full",
                    "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                    "hover:scale-105 active:scale-95 transition-transform",
                  ])}
                >
                  <span className="hidden sm:inline">
                    {primaryCTA.labelFull}
                  </span>
                  <span className="sm:hidden">{primaryCTA.labelShort}</span>
                </a>
              ) : (
                <Link
                  to={primaryCTA.href}
                  className={cn([
                    "inline-block px-8 py-3 text-base font-medium rounded-full",
                    "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                    "hover:scale-105 active:scale-95 transition-transform",
                  ])}
                >
                  <span className="hidden sm:inline">
                    {primaryCTA.labelFull}
                  </span>
                  <span className="sm:hidden">{primaryCTA.labelShort}</span>
                </Link>
              )}
              <Link
                to="/product/notepad"
                className={cn([
                  "inline-block px-8 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%]",
                  "transition-all",
                ])}
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
