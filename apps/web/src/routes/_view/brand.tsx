import { createFileRoute } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";
import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { MockWindow } from "@/components/mock-window";

export const Route = createFileRoute("/_view/brand")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Visual Assets - Hyprnote Press Kit" },
      {
        name: "description",
        content: "Download Hyprnote logos, icons, and visual assets.",
      },
    ],
  }),
});

const VISUAL_ASSETS = [
  {
    id: "icon",
    name: "Icon",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/icon.png",
    description: "Hyprnote app icon",
  },
  {
    id: "logo",
    name: "Logo",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/logo.png",
    description: "Hyprnote wordmark logo",
  },
  {
    id: "symbol-logo",
    name: "Symbol + Logo",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/symbol+logo.png",
    description: "Hyprnote icon with wordmark",
  },
  {
    id: "og-image",
    name: "OpenGraph Image",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/og-image.jpg",
    description: "Social media preview image",
  },
];

function Component() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const selected = VISUAL_ASSETS.find((asset) => asset.id === selectedAsset);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        {/* Hero Section */}
        <div className="px-6 py-16 lg:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
              Visual Assets
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600">
              Download Hyprnote logos, icons, and brand assets for use in your
              projects, articles, or presentations.
            </p>
          </div>
        </div>

        {/* Content Section */}
        <section className="px-6 pb-16 lg:pb-24">
          <div className="max-w-4xl mx-auto">
            <MockWindow
              title="Visual Assets"
              className="rounded-lg w-full max-w-none"
            >
              <div className="h-[600px]">
                {!selectedAsset ? (
                  // Grid view - show all thumbnails in 4 columns
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 overflow-y-auto h-[540px] content-start">
                    {VISUAL_ASSETS.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset.id)}
                        className="group flex flex-col items-center text-center p-4 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer h-fit"
                      >
                        <div className="mb-3 w-16 h-16 flex items-center justify-center">
                          <Image
                            src={asset.url}
                            alt={asset.name}
                            width={64}
                            height={64}
                            className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <div className="font-medium text-stone-600">
                          {asset.name}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  // Split view with resizable panels - list view on left
                  <ResizablePanelGroup
                    direction="horizontal"
                    className="h-[600px]"
                  >
                    <ResizablePanel
                      defaultSize={35}
                      minSize={25}
                      maxSize={45}
                      className="p-4"
                    >
                      <div className="h-full overflow-y-auto space-y-4">
                        {VISUAL_ASSETS.map((asset) => (
                          <button
                            key={asset.id}
                            onClick={() => setSelectedAsset(asset.id)}
                            className={cn([
                              "w-full bg-stone-50 border rounded-lg p-3 hover:border-stone-400 hover:bg-stone-100 transition-colors text-left flex items-center gap-3",
                              asset.id === selectedAsset
                                ? "border-stone-600 bg-stone-100"
                                : "border-neutral-200",
                            ])}
                          >
                            <div className="w-16 h-16 shrink-0 flex items-center justify-center overflow-hidden">
                              <Image
                                src={asset.url}
                                alt={asset.name}
                                width={64}
                                height={64}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-stone-600 truncate">
                                {asset.name}
                              </p>
                              <p className="text-xs text-neutral-500 truncate">
                                {asset.description}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="bg-neutral-200" />

                    <ResizablePanel defaultSize={65}>
                      <div className="h-full flex flex-col">
                        {selected && (
                          <>
                            {/* Header */}
                            <div className="py-2 px-4 flex items-center justify-between mb-6 border-b border-neutral-200">
                              <h2 className="font-medium text-stone-600">
                                {selected.name}
                              </h2>
                              <div className="flex items-center gap-2">
                                <a
                                  href={selected.url}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
                                >
                                  Download
                                </a>
                                <button
                                  onClick={() => setSelectedAsset(null)}
                                  className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                                >
                                  <XIcon size={16} />
                                </button>
                              </div>
                            </div>

                            <div className="p-4 overflow-y-auto">
                              {/* Image preview with max-width 400px */}
                              <Image
                                src={selected.url}
                                alt={selected.name}
                                width={400}
                                height={400}
                                className="max-w-[400px] w-full h-auto object-contain mb-6"
                              />

                              {/* Description */}
                              <p className="text-sm text-neutral-600">
                                {selected.description}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                )}
              </div>

              {/* Status bar */}
              <div className="bg-stone-50 border-t border-neutral-200 px-4 py-2">
                <span className="text-xs text-neutral-500">
                  {selectedAsset
                    ? `Viewing ${selected?.name}`
                    : `${VISUAL_ASSETS.length} visual assets`}
                </span>
              </div>
            </MockWindow>
          </div>
        </section>
      </div>
    </div>
  );
}
