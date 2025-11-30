import { Link, useRouterState } from "@tanstack/react-router";
import { ExternalLinkIcon, MailIcon } from "lucide-react";

function getMaxWidthClass(pathname: string): string {
  const isBlogOrDocs =
    pathname.startsWith("/blog") || pathname.startsWith("/docs");
  return isBlogOrDocs ? "max-w-6xl" : "max-w-6xl";
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const router = useRouterState();
  const maxWidthClass = getMaxWidthClass(router.location.pathname);

  return (
    <footer className="border-t border-neutral-100 bg-linear-to-b from-stone-50/30 to-stone-100">
      <div
        className={`${maxWidthClass} mx-auto px-4 laptop:px-0 py-12 lg:py-16 border-x border-neutral-100`}
      >
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <Link to="/" className="inline-block mb-4">
              <img
                src="/api/images/hyprnote/logo.svg"
                alt="Hyprnote"
                className="h-6"
              />
            </Link>
            <p className="text-sm text-neutral-500 mb-4">
              Fastrepl © {currentYear}
            </p>
            <p className="text-sm text-neutral-600 mb-3">
              Are you in back-to-back meetings?{" "}
              <Link
                to="/join-waitlist"
                className="text-neutral-600 hover:text-stone-600 transition-colors underline"
              >
                Get started
              </Link>
            </p>
            <p className="text-sm text-neutral-500">
              <Link
                to="/legal/$slug"
                params={{ slug: "terms" }}
                className="hover:text-stone-600 transition-colors underline"
              >
                Terms
              </Link>
              {" · "}
              <Link
                to="/legal/$slug"
                params={{ slug: "privacy" }}
                className="hover:text-stone-600 transition-colors underline"
              >
                Privacy
              </Link>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
                Product
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/download"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Download
                  </Link>
                </li>
                <li>
                  <Link
                    to="/changelog"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Releases
                  </Link>
                </li>
                <li>
                  <Link
                    to="/roadmap"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Roadmap
                  </Link>
                </li>
                <li>
                  <Link
                    to="/docs"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Docs
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/fastrepl/hyprnote"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1"
                  >
                    GitHub
                    <ExternalLinkIcon className="size-3" />
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
                Resources
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/faq"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:support@hyprnote.com"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1"
                  >
                    Support
                    <MailIcon className="size-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/fastrepl/hyprnote/discussions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1"
                  >
                    Discussions
                    <ExternalLinkIcon className="size-3" />
                  </a>
                </li>
                <li>
                  <Link
                    to="/pricing"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    to="/gallery"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Prompt Gallery
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
                Company
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/blog"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    About us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/brand"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Brand
                  </Link>
                </li>
                <li>
                  <Link
                    to="/press-kit"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Press Kit
                  </Link>
                </li>
                <li>
                  <Link
                    to="/opensource"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Open Source
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
                Social
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="/x"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1"
                  >
                    Twitter
                    <ExternalLinkIcon className="size-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://bsky.app/profile/hyprnote.bsky.social"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1"
                  >
                    Bluesky
                    <ExternalLinkIcon className="size-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.reddit.com/r/Hyprnote/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1"
                  >
                    Reddit
                    <ExternalLinkIcon className="size-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="/discord"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1"
                  >
                    Discord
                    <ExternalLinkIcon className="size-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="/youtube"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1"
                  >
                    YouTube
                    <ExternalLinkIcon className="size-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
