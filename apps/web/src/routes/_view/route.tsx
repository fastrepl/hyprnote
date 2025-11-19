import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Menu } from "lucide-react";
import { createContext, useContext, useState } from "react";

import { getPlatformCTA, usePlatform } from "@/hooks/use-platform";

export const Route = createFileRoute("/_view")({
  component: Component,
  loader: async ({ context }) => ({ user: context.user }),
});

interface HeroContextType {
  onTrigger: (() => void) | null;
  setOnTrigger: (callback: () => void) => void;
}

const HeroContext = createContext<HeroContextType | null>(null);

export function useHeroContext() {
  return useContext(HeroContext);
}

function getMaxWidthClass(pathname: string): string {
  const isBlogOrDocs =
    pathname.startsWith("/blog") || pathname.startsWith("/docs");
  return isBlogOrDocs ? "max-w-6xl" : "max-w-6xl";
}

function Component() {
  const router = useRouterState();
  const isDocsPage = router.location.pathname.startsWith("/docs");
  const [onTrigger, setOnTrigger] = useState<(() => void) | null>(null);

  return (
    <HeroContext.Provider
      value={{
        onTrigger,
        setOnTrigger: (callback) => setOnTrigger(() => callback),
      }}
    >
      <div className="min-h-screen flex flex-col overflow-x-hidden">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        {!isDocsPage && <Footer />}
      </div>
    </HeroContext.Provider>
  );
}

const productsList = [
  { to: "/product/notepad", label: "Notepad" },
  { to: "/product/bot", label: "Bot", badge: "Coming Soon" },
  { to: "/product/api", label: "API", badge: "Coming Soon" },
  { to: "/product/extensions", label: "Extensions", badge: "Coming Soon" },
];

const featuresList = [
  { to: "/product/ai-notetaking", label: "AI Notetaking" },
  { to: "/product/ai-assistant", label: "AI Assistant" },
  { to: "/product/mini-apps", label: "Mini Apps" },
  { to: "/product/workflows", label: "Workflows", badge: "Coming Soon" },
];

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const platform = usePlatform();
  const heroContext = useHeroContext();
  const platformCTA = getPlatformCTA(platform);
  const router = useRouterState();
  const maxWidthClass = getMaxWidthClass(router.location.pathname);

  const handleCTAClick = (e: React.MouseEvent) => {
    if (platformCTA.action === "download") {
      return;
    }

    e.preventDefault();
    if (heroContext?.onTrigger) {
      heroContext.onTrigger();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-neutral-100 z-50 h-[69px]">
        <div
          className={`${maxWidthClass} mx-auto px-4 laptop:px-0 border-x border-neutral-100 h-full`}
        >
          <div className="flex items-center justify-between h-full">
            <div className="hidden sm:flex items-center gap-5">
              <Link
                to="/"
                className="font-semibold text-2xl font-serif hover:scale-105 transition-transform mr-4"
              >
                <img
                  src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/logo.svg"
                  alt="Hyprnote"
                  className="h-6"
                />
              </Link>
              <div
                className="relative"
                onMouseEnter={() => setIsProductOpen(true)}
                onMouseLeave={() => setIsProductOpen(false)}
              >
                <button className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-800 transition-all py-2">
                  Product
                  {isProductOpen ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
                {isProductOpen && (
                  <div className="absolute top-full left-0 pt-2 w-[520px] z-50">
                    <div className="bg-white border border-neutral-200 rounded-sm shadow-lg py-2">
                      <div className="px-3 py-2 grid grid-cols-2 gap-x-6">
                        <div>
                          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                            Products
                          </div>
                          {productsList.map((link) => (
                            <Link
                              key={link.to}
                              to={link.to}
                              onClick={() => setIsProductOpen(false)}
                              className="py-2 text-sm text-neutral-700 flex items-center justify-between hover:underline decoration-dotted"
                            >
                              <span>{link.label}</span>
                              {link.badge && (
                                <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                                  {link.badge}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                            Features
                          </div>
                          <div>
                            {featuresList.map((link) => (
                              <Link
                                key={link.to}
                                to={link.to}
                                onClick={() => setIsProductOpen(false)}
                                className="py-2 text-sm text-neutral-700 flex items-center justify-between hover:underline decoration-dotted"
                              >
                                <span>{link.label}</span>
                                {link.badge && (
                                  <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                                    {link.badge}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Link
                to="/docs"
                className="hidden md:block text-sm text-neutral-600 hover:text-neutral-800 transition-all hover:underline decoration-dotted"
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
              <Link
                to="/enterprise"
                className="hidden md:block text-sm text-neutral-600 hover:text-neutral-800 transition-all hover:underline decoration-dotted"
              >
                Enterprise
              </Link>
            </div>

            <Link
              to="/"
              className="sm:hidden font-semibold text-2xl font-serif hover:scale-105 transition-transform"
            >
              <img
                src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/logo.svg"
                alt="Hyprnote"
                className="h-6"
              />
            </Link>

            <nav className="hidden sm:flex items-center gap-2">
              <Link
                to="/join-waitlist"
                className="px-4 h-8 flex items-center text-sm text-neutral-600 hover:text-neutral-800 transition-all hover:underline decoration-dotted"
              >
                Get started
              </Link>
              {platformCTA.action === "download" ? (
                <a
                  href="/download/apple-silicon"
                  download
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
                >
                  {platformCTA.label}
                </a>
              ) : (
                <button
                  onClick={handleCTAClick}
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
                >
                  {platformCTA.label}
                </button>
              )}
            </nav>

            <div className="sm:hidden flex items-center gap-1">
              {platformCTA.action === "download" ? (
                <a
                  href="/download/apple-silicon"
                  download
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md active:scale-[98%] transition-all"
                >
                  {platformCTA.label}
                </a>
              ) : (
                <button
                  onClick={handleCTAClick}
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md active:scale-[98%] transition-all"
                >
                  {platformCTA.label}
                </button>
              )}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="px-3 h-8 flex items-center text-sm border border-neutral-200 rounded-full hover:bg-neutral-50 active:scale-[98%] transition-all"
                aria-label="Open menu"
              >
                <Menu className="text-neutral-600" size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <>
          <div
            className="fixed top-[65px] left-0 right-0 bottom-0 bg-black/20 z-40 sm:hidden animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />

          <div className="fixed top-[65px] left-0 right-0 bg-white border-b border-neutral-100 shadow-lg z-50 sm:hidden animate-in slide-in-from-top duration-300 max-h-[calc(100vh-65px)] overflow-y-auto">
            <nav className={`${maxWidthClass} mx-auto px-4 py-6`}>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <button
                      onClick={() => setIsProductOpen(!isProductOpen)}
                      className="flex items-center justify-between w-full text-base text-neutral-700 hover:text-neutral-900 transition-colors"
                    >
                      <span>Product</span>
                      {isProductOpen ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    {isProductOpen && (
                      <div className="mt-3 ml-4 space-y-4 border-l-2 border-neutral-200 pl-4">
                        <div>
                          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                            Products
                          </div>
                          {productsList.map((link) => (
                            <Link
                              key={link.to}
                              to={link.to}
                              onClick={() => setIsMenuOpen(false)}
                              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors flex items-center justify-between py-1"
                            >
                              <span>{link.label}</span>
                              {link.badge && (
                                <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                                  {link.badge}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                            Features
                          </div>
                          {featuresList.map((link) => (
                            <Link
                              key={link.to}
                              to={link.to}
                              onClick={() => setIsMenuOpen(false)}
                              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors flex items-center justify-between py-1"
                            >
                              <span>{link.label}</span>
                              {link.badge && (
                                <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                                  {link.badge}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Link
                    to="/docs"
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-base text-neutral-700 hover:text-neutral-900 transition-colors"
                  >
                    Docs
                  </Link>
                  <Link
                    to="/blog"
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-base text-neutral-700 hover:text-neutral-900 transition-colors"
                  >
                    Blog
                  </Link>
                  <Link
                    to="/pricing"
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-base text-neutral-700 hover:text-neutral-900 transition-colors"
                  >
                    Pricing
                  </Link>
                  <Link
                    to="/enterprise"
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-base text-neutral-700 hover:text-neutral-900 transition-colors"
                  >
                    Enterprise
                  </Link>
                </div>

                <div className="pt-6 border-t border-neutral-100 space-y-3">
                  <Link
                    to="/join-waitlist"
                    className="block w-full px-4 py-3 text-center text-sm text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    Get started
                  </Link>
                  {platformCTA.action === "download" ? (
                    <a
                      href="/download/apple-silicon"
                      download
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full px-4 py-3 text-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-lg shadow-md active:scale-[98%] transition-all"
                    >
                      {platformCTA.label}
                    </a>
                  ) : (
                    <button
                      onClick={(e) => {
                        setIsMenuOpen(false);
                        handleCTAClick(e);
                      }}
                      className="block w-full px-4 py-3 text-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-lg shadow-md active:scale-[98%] transition-all"
                    >
                      {platform === "mobile"
                        ? "Get reminder"
                        : platformCTA.label}
                    </button>
                  )}
                </div>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}

function Footer() {
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
                src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/logo.svg"
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
                  <a
                    href="/download/apple-silicon"
                    download
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Download
                  </a>
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
                    search={{ section: "us" }}
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    About us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    search={{ section: "founders" }}
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Founders
                  </Link>
                </li>
                <li>
                  <Link
                    to="/about"
                    search={{ section: "team" }}
                    className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
                  >
                    Team
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
