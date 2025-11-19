import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

import { MockWindow } from "@/components/mock-window";

export const Route = createFileRoute("/_view/brand")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Brand Guidelines - Hyprnote Press Kit" },
      {
        name: "description",
        content:
          "Hyprnote brand guidelines, colors, typography, and usage rules.",
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
        {/* Content Section */}
        <section className="px-6 py-8 lg:py-12">
          <div className="max-w-4xl mx-auto">
            <MockWindow title="Brand" className="rounded-lg w-full max-w-none">
              <div className="p-8 space-y-8">
                {/* Logo Usage */}
                <div>
                  <h2 className="text-2xl font-serif text-stone-600 mb-4">
                    Logo Usage
                  </h2>
                  <div className="bg-stone-50 border border-neutral-200 rounded-lg p-6">
                    <div className="space-y-3 text-sm text-neutral-600">
                      <div className="flex gap-2">
                        <Icon
                          icon="mdi:check-circle"
                          className="text-lg text-green-600 shrink-0"
                        />
                        <p>Use the logos as provided without modification</p>
                      </div>
                      <div className="flex gap-2">
                        <Icon
                          icon="mdi:check-circle"
                          className="text-lg text-green-600 shrink-0"
                        />
                        <p>Maintain adequate clear space around the logo</p>
                      </div>
                      <div className="flex gap-2">
                        <Icon
                          icon="mdi:check-circle"
                          className="text-lg text-green-600 shrink-0"
                        />
                        <p>Use on appropriate backgrounds for visibility</p>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Icon
                          icon="mdi:close-circle"
                          className="text-lg text-red-600 shrink-0"
                        />
                        <p>Do not distort, rotate, or alter the logo colors</p>
                      </div>
                      <div className="flex gap-2">
                        <Icon
                          icon="mdi:close-circle"
                          className="text-lg text-red-600 shrink-0"
                        />
                        <p>
                          Do not place the logo on busy or conflicting
                          backgrounds
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Brand Colors */}
                <div>
                  <h2 className="text-2xl font-serif text-stone-600 mb-4">
                    Brand Colors
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="aspect-square bg-stone-600 rounded-lg mb-2 border border-neutral-200"></div>
                      <p className="text-sm font-medium text-neutral-700">
                        Stone 600
                      </p>
                      <p className="text-xs text-neutral-500">#57534e</p>
                    </div>
                    <div className="text-center">
                      <div className="aspect-square bg-stone-500 rounded-lg mb-2 border border-neutral-200"></div>
                      <p className="text-sm font-medium text-neutral-700">
                        Stone 500
                      </p>
                      <p className="text-xs text-neutral-500">#78716c</p>
                    </div>
                    <div className="text-center">
                      <div className="aspect-square bg-neutral-600 rounded-lg mb-2 border border-neutral-200"></div>
                      <p className="text-sm font-medium text-neutral-700">
                        Neutral 600
                      </p>
                      <p className="text-xs text-neutral-500">#525252</p>
                    </div>
                    <div className="text-center">
                      <div className="aspect-square bg-white rounded-lg mb-2 border border-neutral-200"></div>
                      <p className="text-sm font-medium text-neutral-700">
                        White
                      </p>
                      <p className="text-xs text-neutral-500">#ffffff</p>
                    </div>
                  </div>
                </div>

                {/* Typography */}
                <div>
                  <h2 className="text-2xl font-serif text-stone-600 mb-4">
                    Typography
                  </h2>
                  <div className="bg-stone-50 border border-neutral-200 rounded-lg p-6 space-y-4">
                    <div>
                      <p className="text-sm text-neutral-500 mb-2">Headings</p>
                      <p className="text-3xl font-serif text-stone-600">
                        Serif Font Family
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 mb-2">Body Text</p>
                      <p className="text-base text-neutral-600">
                        Sans-serif Font Family
                      </p>
                    </div>
                  </div>
                </div>

                {/* Voice & Tone */}
                <div>
                  <h2 className="text-2xl font-serif text-stone-600 mb-4">
                    Voice & Tone
                  </h2>
                  <div className="bg-stone-50 border border-neutral-200 rounded-lg p-6">
                    <ul className="space-y-3 text-sm text-neutral-600">
                      <li className="flex gap-2">
                        <span className="font-semibold shrink-0">
                          Privacy-focused:
                        </span>
                        <span>
                          Emphasize data privacy and local-first approach
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold shrink-0">
                          Professional:
                        </span>
                        <span>
                          Clear, concise, and respectful communication
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold shrink-0">Helpful:</span>
                        <span>
                          Focus on solving user problems and providing value
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-semibold shrink-0">
                          Transparent:
                        </span>
                        <span>Open about our processes and decisions</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Status bar */}
              <div className="bg-stone-50 border-t border-neutral-200 px-4 py-2">
                <span className="text-xs text-neutral-500">
                  Brand Guidelines
                </span>
              </div>
            </MockWindow>
          </div>
        </section>
      </div>
    </div>
  );
}
