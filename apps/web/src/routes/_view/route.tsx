import { cn } from "@hypr/utils";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/_view")({
  component: Component,
  loader: async ({ context }) => ({ user: context.user }),
});

function Component() {
  const router = useRouterState();
  const isDocsPage = router.location.pathname.startsWith("/docs");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {!isDocsPage && <Footer />}
    </div>
  );
}

function Header() {
  const router = useRouterState();
  const isDocsPage = router.location.pathname.startsWith("/docs");

  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-neutral-100 z-50">
      <div
        className={cn(
          "mx-auto px-4 border-x border-neutral-100",
          isDocsPage ? "max-w-[1400px] sm:px-6 lg:px-8 py-4" : "max-w-6xl laptop:px-0 py-3",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="font-semibold text-2xl font-serif hover:scale-105 transition-transform mr-4"
            >
              <img src="/hyprnote/logo.svg" alt="Hyprnote" className="h-6" />
            </Link>
            <Link
              to="/docs"
              className="text-sm text-neutral-600 hover:text-neutral-800 transition-all hover:underline decoration-dotted"
            >
              Docs
            </Link>
            <Link
              to="/blog"
              className="text-sm text-neutral-600 hover:text-neutral-800 transition-all hover:underline decoration-dotted"
            >
              Blog
            </Link>
            <Link
              to="/pricing"
              className="text-sm text-neutral-600 hover:text-neutral-800 transition-all hover:underline decoration-dotted"
            >
              Pricing
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <a
              href="https://tally.so/r/mJaRDY"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
            >
              Join waitlist
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();
  const router = useRouterState();
  const isDocsPage = router.location.pathname.startsWith("/docs");

  return (
    <footer className="border-t border-neutral-100 bg-linear-to-b from-stone-50/30 to-stone-100">
      <div
        className={`${isDocsPage ? "max-w-[1400px]" : "max-w-6xl"} mx-auto px-4 ${
          isDocsPage ? "sm:px-6 lg:px-8" : "laptop:px-0"
        } py-12 lg:py-16 border-x border-neutral-100`}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Column 1: Brand (span 2) */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <img src="/hyprnote/logo.svg" alt="Hyprnote" className="h-6" />
            </Link>
            <p className="text-sm text-neutral-500 mb-4">
              Fastrepl © {currentYear}
            </p>
            <p className="text-sm text-neutral-600 mb-3">
              Are you in back-to-back meetings?{" "}
              <a
                href="https://tally.so/r/mJaRDY"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 hover:text-stone-600 transition-colors underline"
              >
                Get started
              </a>
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

          {/* Column 2: Product */}
          <div className="col-span-1 lg:border-l lg:border-neutral-100 lg:pl-12">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://tally.so/r/mJaRDY"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                >
                  Download
                </a>
              </li>
              <li>
                <Link to="/changelog" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
                  Releases
                </Link>
              </li>
              <li>
                <Link to="/docs" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
                  Roadmap
                </Link>
              </li>
              <li>
                <Link to="/docs" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
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

          {/* Column 3: Resources */}
          <div className="col-span-1 lg:border-l lg:border-neutral-100 lg:pl-12">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/docs" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <a
                  href="https://discord.gg/hyprnote"
                  target="_blank"
                  rel="noopener noreferrer"
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
                <Link to="/pricing" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div className="col-span-1 lg:border-l lg:border-neutral-100 lg:pl-12">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/blog" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <a
                  href="https://cal.com/team/hyprnote/welcome"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                >
                  About
                </a>
              </li>
              <li>
                <Link to="/docs" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
                  Team
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/$slug"
                  params={{ slug: "privacy" }}
                  className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/$slug"
                  params={{ slug: "terms" }}
                  className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Social */}
          <div className="col-span-1 lg:border-l lg:border-neutral-100 lg:pl-12">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Social</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://twitter.com/hyprnote"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/hyprnote"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                >
                  Discord
                </a>
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
        </div>
      </div>
    </footer>
  );
}
