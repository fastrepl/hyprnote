import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteFooter } from "@/components/site-footer";
import { nightlyDownloadSections } from "@/lib/download";
import { getCanonicalUrl } from "@/lib/seo";

export const Route = createFileRoute("/_view/download/nightly/")({
  component: NightlyDownloads,
  head: () => ({
    links: [{ rel: "canonical", href: getCanonicalUrl("/download/nightly/") }],
    meta: [
      { title: "Anarlog Nightly" },
      {
        name: "description",
        content:
          "Try upcoming Anarlog improvements in a separate app before they reach stable.",
      },
    ],
  }),
});

function NightlyDownloads() {
  return (
    <main className="surface text-color min-h-screen">
      <div className="mx-auto w-full max-w-[700px] px-5 py-12 md:px-8">
        <Link
          to="/download/"
          className="text-color-muted text-sm underline underline-offset-4"
        >
          Back to stable downloads
        </Link>
        <h1 className="font-hand mt-16 text-6xl font-semibold">
          Anarlog Nightly
        </h1>
        <p className="mt-6 text-lg leading-7">
          Try upcoming improvements before they reach stable and help us catch
          bugs earlier. Nightly installs as a separate app and receives frequent
          automatic updates.
        </p>
        <div className="border-color-subtle bg-surface-subtle my-8 rounded-xl border p-5 text-sm leading-6">
          <p>
            Nightly may be less reliable. Your existing Anarlog app stays on
            stable.
          </p>
          <p className="mt-3">
            Nightly keeps separate local data. Signing into the same account
            with sync enabled can share changes with your other devices. Use one
            app at a time for recording.
          </p>
        </div>
        <div className="grid gap-9">
          {nightlyDownloadSections.map((section) => (
            <section key={section.name}>
              <h2 className="font-hand mb-3 text-3xl font-semibold">
                {section.name}
              </h2>
              <ul className="border-color-subtle divide-y divide-[var(--color-border-subtle)] border-y">
                {section.downloads.map((download) => (
                  <li
                    key={download.name}
                    className="flex items-center justify-between gap-5 py-4"
                  >
                    <span>{download.name}</span>
                    <a
                      href={download.url}
                      aria-label={`Download Nightly for ${section.name}: ${download.name}`}
                      className="bg-brand-dark rounded-full px-4 py-2 text-sm text-white"
                    >
                      Download Nightly
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="text-color-muted mt-9 text-sm leading-6">
          Release notes are included in Nightly and on{" "}
          <a
            href="https://github.com/fastrepl/anarlog/releases"
            className="text-color underline underline-offset-4"
          >
            GitHub
          </a>
          . Please include your Nightly version and operating system when
          reporting a problem.
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
