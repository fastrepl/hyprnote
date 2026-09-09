import { createFileRoute, Link } from "@tanstack/react-router";

import { DownloadSimple } from "@anlg/ui/components/icons";

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
          "Try upcoming Anarlog improvements on your own notes before they reach stable.",
      },
    ],
  }),
});

function NightlyDownloads() {
  return (
    <>
      <main className="blueprint min-h-screen">
        <div className="mx-auto w-full max-w-[700px] px-5 py-12 md:px-8">
          <Link
            to="/download/"
            className="text-blueprint-fg-muted hover:text-blueprint-fg text-sm underline underline-offset-4"
          >
            Back to stable downloads
          </Link>
          <p className="border-blueprint-line-strong text-blueprint-fg-muted mt-16 flex w-fit rounded-full border px-3 py-1 font-mono text-[11px] tracking-[0.18em] uppercase">
            Preview build
          </p>
          <h1 className="font-hand mt-5 text-6xl leading-[0.98] font-semibold md:text-7xl">
            Anarlog Nightly
          </h1>
          <p className="text-blueprint-fg-muted mt-6 text-lg leading-7">
            Try upcoming improvements before they reach stable and help us catch
            bugs earlier. Nightly installs as a separate app, updates
            frequently, and opens the same notes as your stable Anarlog.
          </p>
          <div className="border-blueprint-line-strong bg-blueprint-deep my-8 grid gap-3 rounded-xl border p-5 text-sm leading-6">
            <p>
              Nightly may be less reliable. Your existing Anarlog app stays on
              stable, and both apps read and write one local notes database.
              Sign-in and app settings stay separate.
            </p>
            <p>
              Quit one app before opening the other. Anarlog refuses to open
              while the other one is running.
            </p>
            <p className="text-blueprint-fg-muted">
              Nightly can update the database format ahead of stable. Most
              changes stay compatible. When one is not, stable shows an update
              prompt and cannot open your notes until a stable release includes
              that change. Keep using Nightly until then.
            </p>
          </div>
          <div className="grid gap-9">
            {nightlyDownloadSections.map((section) => (
              <section key={section.name}>
                <h2 className="font-hand mb-3 text-3xl font-semibold">
                  {section.name}
                </h2>
                <ul className="border-blueprint-line-strong divide-blueprint-line-strong divide-y border-y">
                  {section.downloads.map((download) => (
                    <li
                      key={download.name}
                      className="flex items-center justify-between gap-5 py-4"
                    >
                      <span>{download.name}</span>
                      <a
                        href={download.url}
                        aria-label={`Download Nightly for ${section.name}: ${download.name}`}
                        className="bg-blueprint-fg text-blueprint inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium"
                      >
                        Download Nightly
                        <DownloadSimple size={16} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="text-blueprint-fg-muted mt-9 text-sm leading-6">
            Release notes are included in Nightly and on{" "}
            <a
              href="https://github.com/fastrepl/anarlog/releases"
              className="text-blueprint-fg underline underline-offset-4"
            >
              GitHub
            </a>
            . Please include your Nightly version and operating system when
            reporting a problem.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
