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
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen flex items-center justify-center"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="px-6 py-12 lg:py-20">
          <header className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Self-Hosting
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-8">
              Deploy Hyprnote on your own infrastructure for complete control, maximum security, and full data
              sovereignty.
            </p>
            <button
              disabled
              className="px-8 py-3 text-base font-medium rounded-full bg-neutral-200 text-neutral-500 cursor-not-allowed"
            >
              Coming Soon
            </button>
          </header>
        </div>
      </div>
    </div>
  );
}
