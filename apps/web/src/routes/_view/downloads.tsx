import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/downloads")({
  component: Component,
});

function Component() {
  return (
    <div className="bg-linear-to-b from-white via-blue-50/20 to-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <section className="py-16 sm:py-24 text-center">
          <div className="space-y-6 max-w-2xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight">
              Download Hyprnote
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600">
              Choose your platform to get started with Hyprnote
            </p>
          </div>

          <div className="grid gap-6 mt-12 max-w-2xl mx-auto">
            <DownloadCard
              platform="macOS"
              icon="🍎"
              description="For macOS 11.0 or later"
              downloadUrl="#"
            />
            <DownloadCard
              platform="Windows"
              icon="🪟"
              description="For Windows 10 or later"
              downloadUrl="#"
            />
            <DownloadCard
              platform="Linux"
              icon="🐧"
              description="For Ubuntu, Debian, and more"
              downloadUrl="#"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function DownloadCard({
  platform,
  icon,
  description,
  downloadUrl,
}: {
  platform: string;
  icon: string;
  description: string;
  downloadUrl: string;
}) {
  return (
    <a
      href={downloadUrl}
      className="group flex items-center justify-between p-6 rounded-xl border border-neutral-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200"
    >
      <div className="flex items-center gap-4 text-left">
        <span className="text-4xl">{icon}</span>
        <div>
          <h3 className="text-xl font-serif">{platform}</h3>
          <p className="text-sm text-neutral-600">{description}</p>
        </div>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="h-6 w-6 text-neutral-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
    </a>
  );
}
