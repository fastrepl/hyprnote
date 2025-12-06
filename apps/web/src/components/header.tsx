import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronUp,
  Menu,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import { useState } from "react";

import { Search } from "@/components/search";
import { useDocsDrawer } from "@/hooks/use-docs-drawer";
import { useHandbookDrawer } from "@/hooks/use-handbook-drawer";
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
  const isHandbookPage =
    router.location.pathname.startsWith("/company-handbook");
  const docsDrawer = useDocsDrawer();
  const handbookDrawer = useHandbookDrawer();

  return (
    <>
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-neutral-100 z-50 h-[69px]">
        <div
          className={`${maxWidthClass} mx-auto px-4 laptop:px-0 border-x border-neutral-100 h-full`}
        >
          <div className="flex items-center justify-between h-full">
            <LeftNav
              isDocsPage={isDocsPage}
              isHandbookPage={isHandbookPage}
              docsDrawer={docsDrawer}
              handbookDrawer={handbookDrawer}
              setIsMenuOpen={setIsMenuOpen}
              isProductOpen={isProductOpen}
              setIsProductOpen={setIsProductOpen}
            />
            <DesktopNav platformCTA={platformCTA} />
            <MobileNav
              platform={platform}
              platformCTA={platformCTA}
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              docsDrawer={docsDrawer}
              handbookDrawer={handbookDrawer}
            />
          </div>
        </div>
      </header>

      <MobileMenu
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        isProductOpen={isProductOpen}
        setIsProductOpen={setIsProductOpen}
        platform={platform}
        platformCTA={platformCTA}
        maxWidthClass={maxWidthClass}
      />
    </>
  );
}

function LeftNav({
  isDocsPage,
  isHandbookPage,
  docsDrawer,
  handbookDrawer,
  setIsMenuOpen,
  isProductOpen,
  setIsProductOpen,
}: {
  isDocsPage: boolean;
  isHandbookPage: boolean;
  docsDrawer: ReturnType<typeof useDocsDrawer>;
  handbookDrawer: ReturnType<typeof useHandbookDrawer>;
  setIsMenuOpen: (open: boolean) => void;
  isProductOpen: boolean;
  setIsProductOpen: (open: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <DrawerButton
        isDocsPage={isDocsPage}
        isHandbookPage={isHandbookPage}
        docsDrawer={docsDrawer}
        handbookDrawer={handbookDrawer}
        setIsMenuOpen={setIsMenuOpen}
      />
      <Logo />
      <ProductDropdown
        isProductOpen={isProductOpen}
        setIsProductOpen={setIsProductOpen}
      />
      <NavLinks />
    </div>
  );
}

function DrawerButton({
  isDocsPage,
  isHandbookPage,
  docsDrawer,
  handbookDrawer,
  setIsMenuOpen,
}: {
  isDocsPage: boolean;
  isHandbookPage: boolean;
  docsDrawer: ReturnType<typeof useDocsDrawer>;
  handbookDrawer: ReturnType<typeof useHandbookDrawer>;
  setIsMenuOpen: (open: boolean) => void;
}) {
  if (isDocsPage && docsDrawer) {
    return (
      <button
        onClick={() => {
          if (!docsDrawer.isOpen) {
            setIsMenuOpen(false);
          }
          docsDrawer.setIsOpen(!docsDrawer.isOpen);
        }}
        className="cursor-pointer md:hidden px-3 h-8 flex items-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
        aria-label={
          docsDrawer.isOpen ? "Close docs navigation" : "Open docs navigation"
        }
      >
        {docsDrawer.isOpen ? (
          <PanelLeftClose className="text-neutral-600" size={16} />
        ) : (
          <PanelLeft className="text-neutral-600" size={16} />
        )}
      </button>
    );
  }

  if (isHandbookPage && handbookDrawer) {
    return (
      <button
        onClick={() => {
          if (!handbookDrawer.isOpen) {
            setIsMenuOpen(false);
          }
          handbookDrawer.setIsOpen(!handbookDrawer.isOpen);
        }}
        className="cursor-pointer md:hidden px-3 h-8 flex items-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
        aria-label={
          handbookDrawer.isOpen
            ? "Close handbook navigation"
            : "Open handbook navigation"
        }
      >
        {handbookDrawer.isOpen ? (
          <PanelLeftClose className="text-neutral-600" size={16} />
        ) : (
          <PanelLeft className="text-neutral-600" size={16} />
        )}
      </button>
    );
  }

  return null;
}

function Logo() {
  return (
    <Link
      to="/"
      className="font-semibold text-2xl font-serif hover:scale-105 transition-transform mr-4"
    >
      <img src="/api/images/hyprnote/logo.svg" alt="Hyprnote" className="h-6" />
    </Link>
  );
}

function ProductDropdown({
  isProductOpen,
  setIsProductOpen,
}: {
  isProductOpen: boolean;
  setIsProductOpen: (open: boolean) => void;
}) {
  return (
    <div
      className="relative hidden sm:block"
      onMouseEnter={() => setIsProductOpen(true)}
      onMouseLeave={() => setIsProductOpen(false)}
    >
      <button className="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-800 transition-all py-2">
        Product
        {isProductOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isProductOpen && (
        <div className="absolute top-full left-0 pt-2 w-[520px] z-50">
          <div className="bg-white border border-neutral-200 rounded-sm shadow-lg py-2">
            <div className="px-3 py-2 grid grid-cols-2 gap-x-6">
              <ProductsList onClose={() => setIsProductOpen(false)} />
              <FeaturesList onClose={() => setIsProductOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductsList({ onClose }: { onClose: () => void }) {
  return (
    <div>
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
        Products
      </div>
      {productsList.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          onClick={onClose}
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
  );
}

function FeaturesList({ onClose }: { onClose: () => void }) {
  return (
    <div>
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
        Features
      </div>
      {featuresList.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          onClick={onClose}
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
  );
}

function NavLinks() {
  return (
    <>
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
    </>
  );
}

function DesktopNav({
  platformCTA,
}: {
  platformCTA: ReturnType<typeof getPlatformCTA>;
}) {
  return (
    <nav className="hidden sm:flex items-center gap-2">
      <Search />
      <Link
        to="/join-waitlist"
        className="px-4 h-8 flex items-center text-sm text-neutral-600 hover:text-neutral-800 transition-all hover:underline decoration-dotted"
      >
        Get started
      </Link>
      <CTAButton platformCTA={platformCTA} />
    </nav>
  );
}

function MobileNav({
  platform,
  platformCTA,
  isMenuOpen,
  setIsMenuOpen,
  docsDrawer,
  handbookDrawer,
}: {
  platform: string;
  platformCTA: ReturnType<typeof getPlatformCTA>;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  docsDrawer: ReturnType<typeof useDocsDrawer>;
  handbookDrawer: ReturnType<typeof useHandbookDrawer>;
}) {
  return (
    <div className="sm:hidden flex items-center gap-2">
      <CTAButton platformCTA={platformCTA} platform={platform} mobile />
      <button
        onClick={() => {
          if (!isMenuOpen) {
            if (docsDrawer) {
              docsDrawer.setIsOpen(false);
            }
            if (handbookDrawer) {
              handbookDrawer.setIsOpen(false);
            }
          }
          setIsMenuOpen(!isMenuOpen);
        }}
        className="cursor-pointer px-3 h-8 flex items-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
      >
        <Menu className="text-neutral-600" size={16} />
      </button>
    </div>
  );
}

function CTAButton({
  platformCTA,
  platform,
  mobile = false,
}: {
  platformCTA: ReturnType<typeof getPlatformCTA>;
  platform?: string;
  mobile?: boolean;
}) {
  const baseClass = mobile
    ? "px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md active:scale-[98%] transition-all"
    : "px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all";

  if (mobile && platform === "mobile") {
    return (
      <Link to="/" hash="hero" onClick={scrollToHero} className={baseClass}>
        Get reminder
      </Link>
    );
  }

  if (platformCTA.action === "download") {
    return (
      <a href="/download/apple-silicon" download className={baseClass}>
        {platformCTA.label}
      </a>
    );
  }

  return (
    <Link to="/" hash="hero" onClick={scrollToHero} className={baseClass}>
      {platformCTA.label}
    </Link>
  );
}

function MobileMenu({
  isMenuOpen,
  setIsMenuOpen,
  isProductOpen,
  setIsProductOpen,
  platform,
  platformCTA,
  maxWidthClass,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  isProductOpen: boolean;
  setIsProductOpen: (open: boolean) => void;
  platform: string;
  platformCTA: ReturnType<typeof getPlatformCTA>;
  maxWidthClass: string;
}) {
  if (!isMenuOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 sm:hidden"
        onClick={() => setIsMenuOpen(false)}
      />
      <div
        className="fixed top-[69px] left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-neutral-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] z-50 sm:hidden animate-in slide-in-from-top duration-300 max-h-[calc(100vh-69px)] overflow-y-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <nav className={`${maxWidthClass} mx-auto px-4 py-6`}>
          <div className="space-y-6">
            <MobileMenuLinks
              isProductOpen={isProductOpen}
              setIsProductOpen={setIsProductOpen}
              setIsMenuOpen={setIsMenuOpen}
            />
            <MobileMenuCTAs
              platform={platform}
              platformCTA={platformCTA}
              setIsMenuOpen={setIsMenuOpen}
            />
          </div>
        </nav>
      </div>
    </>
  );
}

function MobileMenuLinks({
  isProductOpen,
  setIsProductOpen,
  setIsMenuOpen,
}: {
  isProductOpen: boolean;
  setIsProductOpen: (open: boolean) => void;
  setIsMenuOpen: (open: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <MobileProductSection
        isProductOpen={isProductOpen}
        setIsProductOpen={setIsProductOpen}
        setIsMenuOpen={setIsMenuOpen}
      />
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
  );
}

function MobileProductSection({
  isProductOpen,
  setIsProductOpen,
  setIsMenuOpen,
}: {
  isProductOpen: boolean;
  setIsProductOpen: (open: boolean) => void;
  setIsMenuOpen: (open: boolean) => void;
}) {
  return (
    <div>
      <button
        onClick={() => setIsProductOpen(!isProductOpen)}
        className="flex items-center justify-between w-full text-base text-neutral-700 hover:text-neutral-900 transition-colors"
      >
        <span>Product</span>
        {isProductOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isProductOpen && (
        <div className="mt-3 ml-4 space-y-4 border-l-2 border-neutral-200 pl-4">
          <MobileProductsList setIsMenuOpen={setIsMenuOpen} />
          <MobileFeaturesList setIsMenuOpen={setIsMenuOpen} />
        </div>
      )}
    </div>
  );
}

function MobileProductsList({
  setIsMenuOpen,
}: {
  setIsMenuOpen: (open: boolean) => void;
}) {
  return (
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
  );
}

function MobileFeaturesList({
  setIsMenuOpen,
}: {
  setIsMenuOpen: (open: boolean) => void;
}) {
  return (
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
  );
}

function MobileMenuCTAs({
  platform,
  platformCTA,
  setIsMenuOpen,
}: {
  platform: string;
  platformCTA: ReturnType<typeof getPlatformCTA>;
  setIsMenuOpen: (open: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <Link
        to="/join-waitlist"
        onClick={() => setIsMenuOpen(false)}
        className="block w-full px-4 py-3 text-center text-sm text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
      >
        Get started
      </Link>
      {platform === "mobile" ? (
        <Link
          to="/"
          hash="hero"
          onClick={() => {
            setIsMenuOpen(false);
            scrollToHero();
          }}
          className="block w-full px-4 py-3 text-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-lg shadow-md active:scale-[98%] transition-all"
        >
          Get reminder
        </Link>
      ) : platformCTA.action === "download" ? (
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
          {platformCTA.label}
        </Link>
      )}
    </div>
  );
}
