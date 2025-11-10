import { cn } from "@hypr/utils";

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/self-hosting")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Self-Hosting - Hyprnote" },
      {
        name: "description",
        content:
          "Deploy Hyprnote on your own infrastructure. Complete control, maximum security, and full data sovereignty.",
      },
    ],
  }),
});

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white h-[calc(100vh-65px)]"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white h-full">
        <div className="bg-[linear-gradient(to_bottom,rgba(245,245,244,0.2),white_50%,rgba(245,245,244,0.3))] px-6 h-full flex items-center justify-center">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
              Self-Hosting
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600">
              Deploy Hyprnote on your own infrastructure for complete control, maximum security, and full data
              sovereignty.
            </p>
            <div className="mt-8">
              <button
                disabled
                className={cn([
                  "inline-block px-8 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                  "opacity-50 cursor-not-allowed",
                ])}
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
