import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronUp,
  Menu,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import { useState } from "react";

import { useDocsDrawer } from "@/hooks/use-docs-drawer";
import { getPlatformCTA, usePlatform } from "@/hooks/use-platform";

function scrollToHero() {
  const heroElement = document.getElementById("hero");
  if (heroElement) {
    heroElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function getMaxWidthClass(pathname: string): string {
  const isBlogOrDocs =
    pathname.startsWith("/blog") || pathname.startsWith("/docs");
  return isBlogOrDocs ? "max-w-6xl" : "max-w-6xl";
}

const productsList = [
  { to: "/product/notepad", label: "Notepad" },
  { to: "/product/memory", label: "Memory", badge: "Coming Soon" },
  { to: "/product/bot", label: "Bot", badge: "Coming Soon" },
  { to: "/product/api", label: "API", badge: "Coming Soon" },
  { to: "/product/extensions", label: "Extensions", badge: "Coming Soon" },
];

const featuresList = [
  { to: "/product/ai-notetaking", label: "AI Notetaking" },
  { to: "/product/ai-assistant", label: "AI Assistant" },
  { to: "/product/mini-apps", label: "Mini Apps" },
  { to: "/gallery", label: "Templates & Shortcuts" },
  { to: "/product/workflows", label: "Workflows", badge: "Coming Soon" },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  const platform = usePlatform();
  const platformCTA = getPlatformCTA(platform);
  const router = useRouterState();
  const maxWidthClass = getMaxWidthClass(router.location.pathname);
  const isDocsPage = router.location.pathname.startsWith("/docs");
  const docsDrawer = useDocsDrawer();

  return (
    <>
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-neutral-100 z-50 h-[69px]">
        <div
          className={`${maxWidthClass} mx-auto px-4 laptop:px-0 border-x border-neutral-100 h-full`}
        >
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-5">
              {isDocsPage && docsDrawer && (
                <button
                  onClick={() => docsDrawer.setIsOpen(!docsDrawer.isOpen)}
                  className="md:hidden px-3 h-8 flex items-center text-sm border border-neutral-200 rounded-full hover:bg-neutral-50 active:scale-[98%] transition-all"
                  aria-label={
                    docsDrawer.isOpen
                      ? "Close docs navigation"
                      : "Open docs navigation"
                  }
                >
                  {docsDrawer.isOpen ? (
                    <PanelLeftClose className="text-neutral-600" size={16} />
                  ) : (
                    <PanelLeft className="text-neutral-600" size={16} />
                  )}
                </button>
              )}
              <Link
                to="/"
                className="font-semibold text-2xl font-serif hover:scale-105 transition-transform mr-4"
              >
                <img
                  src="/api/images/hyprnote/logo.svg"
                  alt="Hyprnote"
                  className="h-6"
                />
              </Link>
              <div
                className="relative hidden sm:block"
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
                                <span className="text-[10px] bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 px-2 py-0.5 rounded-full">
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
                                  <span className="text-[10px] bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 px-2 py-0.5 rounded-full">
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
                className="hidden sm:block text-sm text-neutral-600 hover:text-neutral-800 transition-all hover:underline decoration-dotted"
              >
                Blog
              </Link>
              <Link
                to="/pricing"
                className="hidden sm:block text-sm text-neutral-600 hover:text-neutral-800 transition-all hover:underline decoration-dotted"
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
                <Link
                  to="/"
                  hash="hero"
                  onClick={scrollToHero}
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
                >
                  {platformCTA.label}
                </Link>
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
                <Link
                  to="/"
                  hash="hero"
                  onClick={scrollToHero}
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md active:scale-[98%] transition-all"
                >
                  {platform === "mobile" ? "Get reminder" : platformCTA.label}
                </Link>
              )}
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="cursor-pointer px-3 h-8 flex items-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMenuOpen}
              >
                <Menu className="text-neutral-600" size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <>
          <div className="fixed top-[69px] left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-neutral-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] z-50 sm:hidden animate-in slide-in-from-top duration-300 max-h-[calc(100vh-69px)] overflow-y-auto">
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
                                <span className="text-[10px] bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 px-2 py-0.5 rounded-full">
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
                                <span className="text-[10px] bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 px-2 py-0.5 rounded-full">
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

                <div className="space-y-3">
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
                    <Link
                      to="/"
                      hash="hero"
                      onClick={() => {
                        setIsMenuOpen(false);
                        scrollToHero();
                      }}
                      className="block w-full px-4 py-3 text-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-lg shadow-md active:scale-[98%] transition-all"
                    >
                      {platform === "mobile"
                        ? "Get reminder"
                        : platformCTA.label}
                    </Link>
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
