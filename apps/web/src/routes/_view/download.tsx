import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/download")({
  component: Component,
});

function Component() {
  return (
    <div className="bg-linear-to-b from-white via-blue-50/20 to-white min-h-screen">
      <div
        className={cn([
          "flex items-center justify-center gap-2 text-center",
          "bg-stone-50/70 border-b border-stone-100",
          "py-3 px-4",
          "font-serif text-sm text-stone-700",
        ])}
      >
        <Icon icon="mdi:information-outline" className="text-base" />
        <span>
          Mac (Apple Silicon) features on-device speech-to-text. Other platforms coming soon without on-device
          processing.
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <section className="py-16">
          <div className="space-y-6 max-w-2xl mx-auto text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
              Download Hyprnote
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600">
              Choose your platform to get started with Hyprnote
            </p>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl font-serif tracking-tight mb-6 text-center">
              Desktop
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <DownloadCard
                iconName="simple-icons:apple"
                spec="macOS 14.2+ (Apple Silicon)"
                downloadUrl="#"
                available={true}
              />
              <DownloadCard
                iconName="simple-icons:apple"
                spec="macOS 14.2+ (Intel)"
                downloadUrl="#"
                available={false}
              />
              <DownloadCard
                iconName="simple-icons:windows"
                spec="Windows 10+"
                downloadUrl="#"
                available={false}
              />
              <DownloadCard
                iconName="simple-icons:linux"
                spec="Ubuntu, Debian"
                downloadUrl="#"
                available={false}
              />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-serif tracking-tight mb-6 text-center">
              Mobile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <DownloadCard
                iconName="simple-icons:ios"
                spec="iOS 15+"
                downloadUrl="#"
                available={false}
              />
              <DownloadCard
                iconName="simple-icons:android"
                spec="Android 10+"
                downloadUrl="#"
                available={false}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function DownloadCard({
  iconName,
  spec,
  downloadUrl,
  available,
}: {
  iconName: string;
  spec: string;
  downloadUrl: string;
  available: boolean;
}) {
  return (
    <div className="flex flex-col items-center p-6 rounded-xl border border-neutral-100 bg-white hover:bg-stone-50 transition-all duration-200">
      <Icon icon={iconName} className="text-5xl text-neutral-700 mb-4" />
      <p className="text-sm text-neutral-600 mb-6 text-center">{spec}</p>

      {available
        ? (
          <a
            href={downloadUrl}
            className="group w-full px-4 h-11 flex items-center justify-center bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all text-base font-medium"
          >
            Download
            <Icon
              icon="ph:arrow-circle-right"
              className="text-xl ml-2 group-hover:translate-x-1 transition-transform"
            />
          </a>
        )
        : (
          <button
            disabled
            className="w-full px-4 h-11 bg-neutral-100 text-neutral-400 rounded-full font-medium cursor-not-allowed"
          >
            Coming Soon
          </button>
        )}
    </div>
  );
}
