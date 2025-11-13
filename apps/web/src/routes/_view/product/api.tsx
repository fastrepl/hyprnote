import { MockWindow } from "@/components/mock-window";
import { createFileRoute } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/product/api")({
  component: Component,
  head: () => ({
    meta: [
      { title: "API - Hyprnote" },
      {
        name: "description",
        content: "Hyprnote API for developers. Coming soon.",
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
        <div className="bg-[linear-gradient(to_bottom,rgba(245,245,244,0.2),white_50%,rgba(245,245,244,0.3))] px-6 py-12 h-full overflow-auto flex items-center justify-center">
          <header className="text-center max-w-4xl mx-auto mb-12">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
              Hyprnote API
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600 mb-8">
              Build custom applications and integrations with the Hyprnote API.
            </p>

            <div className="flex justify-center mb-8">
              <MockWindow variant="desktop">
                <div className="p-4 bg-black text-green-400 font-mono text-sm rounded-b-xl text-left">
                  <div className="mb-2">
                    <span className="text-white">$</span> curl -X POST
                    https://api.hyprnote.com/v1/notes \
                  </div>
                  <div className="ml-4 mb-2">
                    -H{" "}
                    <span className="text-yellow-300">
                      "Authorization: Bearer YOUR_API_KEY"
                    </span>{" "}
                    \
                  </div>
                  <div className="ml-4 mb-2">
                    -H{" "}
                    <span className="text-yellow-300">
                      "Content-Type: application/json"
                    </span>{" "}
                    \
                  </div>
                  <div className="ml-4 mb-4">
                    -d{" "}
                    <span className="text-yellow-300">
                      '{"{"}"title": "Meeting Notes", "content": "..."{"}"}'
                    </span>
                  </div>
                  <div className="text-gray-400">
                    {"{"}
                    <div className="ml-4">"id": "note_1a2b3c4d",</div>
                    <div className="ml-4">"title": "Meeting Notes",</div>
                    <div className="ml-4">
                      "created_at": "2025-11-09T10:30:00Z"
                    </div>
                    {"}"}
                  </div>
                </div>
              </MockWindow>
            </div>

            <div>
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
          </header>
        </div>
      </div>
    </div>
  );
}
