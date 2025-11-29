import { Link, useRouterState } from "@tanstack/react-router";

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
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">
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
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">
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
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Support
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/fastrepl/hyprnote/discussions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Discussions
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
                    to="/press-kit"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Press Kit
                  </Link>
                </li>
                <li>
                  <Link
                    to="/gallery"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Gallery
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">
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
                    to="/enterprise"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Enterprise
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                Social
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="/x"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="/discord"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Discord
                  </a>
                </li>
                <li>
                  <a
                    href="/youtube"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    YouTube
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
