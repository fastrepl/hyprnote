import { Image } from "@/components/image";
import { getPlatformCTA, usePlatform } from "@/hooks/use-platform";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useState } from "react";

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
  const isBlogOrDocs = pathname.startsWith("/blog") || pathname.startsWith("/docs");
  return isBlogOrDocs ? "max-w-6xl" : "max-w-6xl";
}

function Component() {
  const router = useRouterState();
  const isDocsPage = router.location.pathname.startsWith("/docs");
  const [onTrigger, setOnTrigger] = useState<(() => void) | null>(null);

  return (
    <HeroContext.Provider value={{ onTrigger, setOnTrigger: (callback) => setOnTrigger(() => callback) }}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        {!isDocsPage && <Footer />}
      </div>
    </HeroContext.Provider>
  );
}

const productLinks = [
  { to: "/product/notetaking", label: "Notetaking" },
  { to: "/product/ai-notetaking", label: "AI Notetaking" },
  { to: "/product/local", label: "Local AI" },
  { to: "/product/templates", label: "Templates" },
  { to: "/product/transcript", label: "Transcripts" },
  { to: "/product/summary", label: "Summaries" },
  { to: "/product/chat", label: "Chat" },
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
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-neutral-100 z-50">
        <div className={`${maxWidthClass} mx-auto px-4 laptop:px-0 border-x border-neutral-100 py-4`}>
          <div className="flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-4">
              <Link
                to="/"
                className="font-semibold text-2xl font-serif hover:scale-105 transition-transform mr-4"
              >
                <Image
                  src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/logo.svg"
                  alt="Hyprnote"
                  className="h-6"
                  background="auto"
                />
              </Link>
              <div
                className="relative"
                onMouseEnter={() => setIsProductOpen(true)}
                onMouseLeave={() => setIsProductOpen(false)}
              >
                <button className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-800 transition-all py-2">
                  Product
                  <Icon icon={isProductOpen ? "mdi:chevron-up" : "mdi:chevron-down"} className="text-base" />
                </button>
                {isProductOpen && (
                  <div className="absolute top-full left-0 pt-2 w-64 z-50">
                    <div className="bg-white border border-neutral-200 rounded-sm shadow-lg py-2">
                      <div className="px-3 py-2">
                        <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                          Features
                        </div>
                        {productLinks.map((link) => (
                          <Link
                            key={link.to}
                            to={link.to}
                            className="block py-2 text-sm text-neutral-700"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
              <Link
                to="/enterprise"
                className="text-sm text-neutral-600 hover:text-neutral-800 transition-all hover:underline decoration-dotted"
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
              {platformCTA.action === "download"
                ? (
                  <a
                    href="/download/apple-silicon"
                    download
                    className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
                  >
                    {platformCTA.label}
                  </a>
                )
                : (
                  <button
                    onClick={handleCTAClick}
                    className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
                  >
                    {platformCTA.label}
                  </button>
                )}
            </nav>

            <div className="sm:hidden flex items-center gap-1">
              {platformCTA.action === "download"
                ? (
                  <a
                    href="/download/apple-silicon"
                    download
                    className="px-3 h-8 flex items-center text-xs bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md active:scale-[98%] transition-all"
                  >
                    {platformCTA.label}
                  </a>
                )
                : (
                  <button
                    onClick={handleCTAClick}
                    className="px-3 h-8 flex items-center text-xs bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md active:scale-[98%] transition-all"
                  >
                    {platform === "mobile" ? "Remind me" : platformCTA.label}
                  </button>
                )}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="px-3 h-8 flex items-center text-sm border border-neutral-200 rounded-full hover:bg-neutral-50 active:scale-[98%] transition-all"
                aria-label="Open menu"
              >
                <Icon icon="mdi:menu" className="text-lg text-neutral-600" />
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
                      <Icon icon={isProductOpen ? "mdi:chevron-up" : "mdi:chevron-down"} className="text-lg" />
                    </button>
                    {isProductOpen && (
                      <div className="mt-3 ml-4 space-y-2 border-l-2 border-neutral-200 pl-4">
                        <Link
                          to="/product/notetaking"
                          onClick={() => setIsMenuOpen(false)}
                          className="block text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                          Notetaking
                        </Link>
                        <Link
                          to="/product/ai-notetaking"
                          onClick={() => setIsMenuOpen(false)}
                          className="block text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                          AI Notetaking
                        </Link>
                        <Link
                          to="/product/local"
                          onClick={() => setIsMenuOpen(false)}
                          className="block text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                          Local AI
                        </Link>
                        <Link
                          to="/product/templates"
                          onClick={() => setIsMenuOpen(false)}
                          className="block text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                          Templates
                        </Link>
                        <Link
                          to="/product/transcript"
                          onClick={() => setIsMenuOpen(false)}
                          className="block text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                          Transcripts
                        </Link>
                        <Link
                          to="/product/summary"
                          onClick={() => setIsMenuOpen(false)}
                          className="block text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                          Summaries
                        </Link>
                        <Link
                          to="/product/chat"
                          onClick={() => setIsMenuOpen(false)}
                          className="block text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                          Chat
                        </Link>
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
                  {platformCTA.action === "download"
                    ? (
                      <a
                        href="/download/apple-silicon"
                        download
                        onClick={() => setIsMenuOpen(false)}
                        className="block w-full px-4 py-3 text-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-lg shadow-md active:scale-[98%] transition-all"
                      >
                        {platformCTA.label}
                      </a>
                    )
                    : (
                      <button
                        onClick={(e) => {
                          setIsMenuOpen(false);
                          handleCTAClick(e);
                        }}
                        className="block w-full px-4 py-3 text-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-lg shadow-md active:scale-[98%] transition-all"
                      >
                        {platform === "mobile" ? "Get reminder" : platformCTA.label}
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
      <div className={`${maxWidthClass} mx-auto px-4 laptop:px-0 py-12 lg:py-16 border-x border-neutral-100`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
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

          <div className="col-span-1 lg:border-l lg:border-neutral-100 lg:pl-12">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Product</h3>
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
                <Link to="/changelog" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
                  Releases
                </Link>
              </li>
              <li>
                <Link to="/roadmap" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
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

          <div className="col-span-1 lg:border-l lg:border-neutral-100 lg:pl-12">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/faq" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
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
                <Link to="/pricing" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-1 lg:border-l lg:border-neutral-100 lg:pl-12">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/blog" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/team" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
                  Team
                </Link>
              </li>
              <li>
                <Link to="/enterprise" className="text-sm text-neutral-600 hover:text-stone-600 transition-colors">
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

          <div className="col-span-1 lg:border-l lg:border-neutral-100 lg:pl-12">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Social</h3>
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
    </footer>
  );
}
