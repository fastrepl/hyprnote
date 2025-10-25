import { Typewriter } from "@hypr/ui/components/ui/typewriter";
import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/")({
  component: Component,
});

function Component() {
  return (
    <div>
      <main className="flex-1 bg-linear-to-b from-white via-blue-50/20 to-white min-h-screen">
        <div className="max-w-6xl mx-auto py-12 border-x border-neutral-100">
          <section className="py-16 sm:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-8 gap-12 items-center">
              <div className="space-y-6 lg:col-span-3">
                <h1 className="text-4xl sm:text-5xl font-serif tracking-tight whitespace-pre-wrap">
                  The AI notepad for{" "}
                  <Typewriter
                    text={["your meetings", "your lectures", "your thoughts"]}
                    className="text-blue-600 text-4xl sm:text-5xl font-serif tracking-tight"
                    speed={100}
                    deleteSpeed={50}
                    waitTime={2000}
                  />
                </h1>
                <p className="text-lg sm:text-xl text-neutral-600 max-w-xl">
                  Hyprnote is a notetaking app that listens and summarizes the world around you
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <DownloadButton />
                  <p className="text-neutral-500 self-center">
                    Free and{" "}
                    <a
                      className="decoration-dotted underline hover:text-blue-600 transition-all"
                      href="https://github.com/fastrepl/hyprnote"
                      target="_blank"
                    >
                      open source
                    </a>
                  </p>
                </div>
              </div>

              <div className="relative aspect-video bg-linear-to-br from-blue-50 to-neutral-50 rounded-2xl border-2 border-neutral-200 shadow-xl overflow-hidden lg:col-span-5">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Icon icon="mdi:play-circle-outline" className="text-6xl text-neutral-400 mx-auto" />
                    <p className="text-neutral-500 font-medium">Demo video coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 sm:py-24 border-t border-neutral-100 text-center">
            <div className="space-y-6 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-serif">
                Built for developers
              </h2>
              <div className="grid gap-3 pt-2">
                {[
                  "AI-powered search and organization",
                  "Local-first, fast performance",
                  "Clean, distraction-free UI",
                  "Open source & privacy-focused",
                ].map((item, index) => (
                  <div
                    key={index}
                    className="group flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50/30 transition-all duration-200"
                  >
                    <svg
                      className="h-5 w-5 flex-none text-blue-600 mt-0.5 group-hover:scale-110 transition-transform"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-base leading-relaxed text-neutral-700 text-left">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 sm:py-24 border-t border-neutral-100">
            <div className="space-y-6 text-center">
              <h2 className="text-2xl sm:text-3xl">
                Ready to get started?
              </h2>
              <p className="text-lg text-neutral-600 max-w-xl mx-auto">
                Download Hyprnote today and experience note-taking reimagined.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <DownloadButton />
                <GithubStars />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function DownloadButton() {
  return (
    <Link
      to="/downloads"
      className={cn([
        "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
        "bg-linear-to-t from-blue-600 to-blue-500 text-white rounded-full",
        "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
        "transition-all",
      ])}
    >
      Download now
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    </Link>
  );
}

function GithubStars() {
  const LAST_SEEN = 6400;
  const ORG_REPO = "fastrepl/hyprnote";

  const star = useQuery({
    queryKey: ["github-stars"],
    queryFn: async () => {
      const response = await fetch(`https://api.github.com/repos/${ORG_REPO}`);
      const data = await response.json();
      return data.stargazers_count ?? LAST_SEEN;
    },
  });

  const render = (n: number) => n > 1000 ? `${(n / 1000).toFixed(1)}k` : n;

  return (
    <a href={`https://github.com/${ORG_REPO}`} target="_blank">
      <button
        className={cn([
          "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
          "bg-linear-to-t from-neutral-800 to-neutral-700 text-white rounded-full",
          "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
          "transition-all cursor-pointer",
        ])}
      >
        <Icon icon="mdi:github" className="text-xl" />
        <span className="ml-2">{star.data ? render(star.data) : render(LAST_SEEN)} stars</span>
      </button>
    </a>
  );
}
