import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRightIcon, ExternalLinkIcon, MailIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Checkbox } from "@hypr/ui/components/ui/checkbox";
import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { addContact } from "@/functions/loops";

function getNextRandomIndex(length: number, prevIndex: number): number {
  if (length <= 1) return 0;
  let next = prevIndex;
  while (next === prevIndex) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

const vsList = [
  { slug: "otter", name: "Otter.ai" },
  { slug: "granola", name: "Granola" },
  { slug: "fireflies", name: "Fireflies" },
  { slug: "fathom", name: "Fathom" },
  { slug: "notion", name: "Notion" },
  { slug: "obsidian", name: "Obsidian" },
];

const useCasesList = [
  { to: "/solution/sales", label: "Sales" },
  { to: "/solution/recruiting", label: "Recruiting" },
  { to: "/solution/consulting", label: "Consulting" },
  { to: "/solution/coaching", label: "Coaching" },
  { to: "/solution/research", label: "Research" },
  { to: "/solution/journalism", label: "Journalism" },
];

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
        <div className="flex flex-col lg:flex-row gap-12">
          <BrandSection currentYear={currentYear} />
          <LinksGrid />
        </div>
      </div>
    </footer>
  );
}

function BrandSection({ currentYear }: { currentYear: number }) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [subscriptions, setSubscriptions] = useState({
    releaseNotesStable: false,
    releaseNotesBeta: false,
    newsletter: false,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  const mutation = useMutation({
    mutationFn: async () => {
      await addContact({
        data: {
          email,
          userGroup: "Subscriber",
          source: "FOOTER",
          releaseNotesStable: subscriptions.releaseNotesStable,
          releaseNotesBeta: subscriptions.releaseNotesBeta,
          newsletter: subscriptions.newsletter,
        },
      });
    },
    onSuccess: () => {
      setPopoverOpen(false);
      form.reset();
      setEmail("");
      setSubscriptions({
        releaseNotesStable: false,
        releaseNotesBeta: false,
        newsletter: false,
      });
    },
  });

  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      setEmail(value.email);
    },
  });

  const hasSelection =
    subscriptions.releaseNotesStable ||
    subscriptions.releaseNotesBeta ||
    subscriptions.newsletter;

  return (
    <div className="lg:flex-1">
      <Link to="/" className="inline-block mb-4">
        <Image
          src="/api/images/hyprnote/logo.svg"
          alt="Hyprnote"
          className="h-6"
        />
      </Link>
      <p className="text-sm text-neutral-500 mb-4">Fastrepl © {currentYear}</p>

      <div className="mb-4 relative" ref={containerRef}>
        {expanded && (
          <div className="absolute bottom-full left-0 w-72 bg-white border border-b-0 laptop:border-l-0 border-stone-100 p-4 space-y-4">
            <p className="text-sm font-medium text-neutral-900">
              What would you like to receive?
            </p>

            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-neutral-700 uppercase tracking-wide">
                  Release Notes
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={subscriptions.releaseNotesStable}
                    onCheckedChange={(checked) =>
                      setSubscriptions((prev) => ({
                        ...prev,
                        releaseNotesStable: checked === true,
                      }))
                    }
                    className="data-[state=checked]:bg-black data-[state=checked]:border-black data-[state=checked]:text-white"
                  />
                  <span className="text-sm text-neutral-600">Stable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={subscriptions.releaseNotesBeta}
                    onCheckedChange={(checked) =>
                      setSubscriptions((prev) => ({
                        ...prev,
                        releaseNotesBeta: checked === true,
                      }))
                    }
                    className="data-[state=checked]:bg-black data-[state=checked]:border-black data-[state=checked]:text-white"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-neutral-600">Beta</span>
                    <span className="text-xs text-neutral-400">
                      - includes beta download link
                    </span>
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-neutral-700 uppercase tracking-wide">
                  Newsletter
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={subscriptions.newsletter}
                    onCheckedChange={(checked) =>
                      setSubscriptions((prev) => ({
                        ...prev,
                        newsletter: checked === true,
                      }))
                    }
                    className="data-[state=checked]:bg-black data-[state=checked]:border-black data-[state=checked]:text-white"
                  />
                  <span className="text-sm text-neutral-600">Blog</span>
                </label>
              </div>
            </div>

            {mutation.isError && (
              <p className="text-xs text-red-500">
                Something went wrong. Please try again.
              </p>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (expanded && hasSelection && email) {
              mutation.mutate();
            }
          }}
          className={cn([
            "max-w-72 border border-neutral-100 bg-white transition-all laptop:border-l-0",
            expanded && "shadow-lg",
          ])}
        >
          <form.Field name="email">
            {(field) => (
              <div className="relative flex items-center">
                <MailIcon className="absolute left-2.5 size-3.5 text-neutral-400" />
                <input
                  type="email"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    setEmail(e.target.value);
                  }}
                  onFocus={() => setExpanded(true)}
                  placeholder={
                    expanded ? "Enter your email" : "Subscribe to updates"
                  }
                  className={cn([
                    "min-w-0 flex-1 pl-8 pr-2 py-1.5 text-sm",
                    "bg-transparent placeholder:text-neutral-400",
                    "focus:outline-none",
                  ])}
                />
                <button
                  type={expanded ? "submit" : "button"}
                  onClick={() => !expanded && setExpanded(true)}
                  disabled={
                    expanded && (!hasSelection || !email || mutation.isPending)
                  }
                  className={cn([
                    "shrink-0 px-2 transition-colors focus:outline-none",
                    expanded && hasSelection && email
                      ? "text-stone-600"
                      : "text-neutral-300",
                    mutation.isPending && "opacity-50",
                  ])}
                >
                  <ArrowRightIcon className="size-4" />
                </button>
              </div>
            )}
          </form.Field>
        </form>
      </div>

      <p className="text-sm text-neutral-500">
        <Link
          to="/legal/$slug"
          params={{ slug: "terms" }}
          className="hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
        >
          Terms
        </Link>
        {" · "}
        <Link
          to="/legal/$slug"
          params={{ slug: "privacy" }}
          className="hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
        >
          Privacy
        </Link>
      </p>
    </div>
  );
}

function LinksGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:shrink-0">
      <ProductLinks />
      <ResourcesLinks />
      <CompanyLinks />
      <ToolsLinks />
      <SocialLinks />
    </div>
  );
}

function ProductLinks() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
        Product
      </h3>
      <ul className="space-y-3">
        <li>
          <Link
            to="/download"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Download
          </Link>
        </li>
        <li>
          <Link
            to="/changelog"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Changelog
          </Link>
        </li>
        <li>
          <Link
            to="/roadmap"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Roadmap
          </Link>
        </li>
        <li>
          <Link
            to="/docs"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Docs
          </Link>
        </li>
        <li>
          <a
            href="https://github.com/fastrepl/hyprnote"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            GitHub
            <ExternalLinkIcon className="size-3" />
          </a>
        </li>
        <li>
          <a
            href="https://status.hyprnote.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            Status
            <ExternalLinkIcon className="size-3" />
          </a>
        </li>
      </ul>
    </div>
  );
}

function ResourcesLinks() {
  const [vsIndex, setVsIndex] = useState(() =>
    Math.floor(Math.random() * vsList.length),
  );
  const [useCaseIndex, setUseCaseIndex] = useState(() =>
    Math.floor(Math.random() * useCasesList.length),
  );

  const currentVs = vsList[vsIndex];
  const currentUseCase = useCasesList[useCaseIndex];

  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
        Resources
      </h3>
      <ul className="space-y-3">
        <li>
          <Link
            to="/pricing"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Pricing
          </Link>
        </li>
        <li>
          <a
            href="/docs/faq"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            FAQ
          </a>
        </li>
        <li>
          <Link
            to="/company-handbook"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Company Handbook
          </Link>
        </li>
        <li>
          <Link
            to="/gallery"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Prompt Gallery
          </Link>
        </li>
        <li>
          <a
            href="https://github.com/fastrepl/hyprnote/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            Discussions
            <ExternalLinkIcon className="size-3" />
          </a>
        </li>
        <li>
          <a
            href="mailto:support@hyprnote.com"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            Support
            <MailIcon className="size-3" />
          </a>
        </li>
        <li>
          <Link
            to={currentUseCase.to}
            className="group text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
            aria-label={`Hyprnote for ${currentUseCase.label}`}
            onMouseEnter={() => {
              setUseCaseIndex((prev) =>
                getNextRandomIndex(useCasesList.length, prev),
              );
            }}
            onFocus={() => {
              setUseCaseIndex((prev) =>
                getNextRandomIndex(useCasesList.length, prev),
              );
            }}
          >
            👍 for{" "}
            <span className="blur-sm group-hover:blur-none group-focus:blur-none transition-all duration-150">
              {currentUseCase.label}
            </span>
          </Link>
        </li>
        <li>
          <Link
            to="/vs/$slug"
            params={{ slug: currentVs.slug }}
            className="group text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
            aria-label={`Versus ${currentVs.name}`}
            onMouseEnter={() => {
              setVsIndex((prev) => getNextRandomIndex(vsList.length, prev));
            }}
            onFocus={() => {
              setVsIndex((prev) => getNextRandomIndex(vsList.length, prev));
            }}
          >
            <img
              src="/api/images/hyprnote/icon.png"
              alt="Hyprnote"
              width={12}
              height={12}
              className="size-4 rounded border border-neutral-100 inline"
            />{" "}
            vs{" "}
            <span className="blur-sm group-hover:blur-none group-focus:blur-none transition-all duration-150">
              {currentVs.name}
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

function CompanyLinks() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
        Company
      </h3>
      <ul className="space-y-3">
        <li>
          <Link
            to="/blog"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Blog
          </Link>
        </li>
        <li>
          <Link
            to="/about"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            About us
          </Link>
        </li>
        <li>
          <Link
            to="/brand"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Brand
          </Link>
        </li>
        <li>
          <Link
            to="/press-kit"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Press Kit
          </Link>
        </li>
        <li>
          <Link
            to="/opensource"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Open Source
          </Link>
        </li>
      </ul>
    </div>
  );
}

function ToolsLinks() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900 mb-4 font-serif">
        Tools
      </h3>
      <ul className="space-y-3">
        <li>
          <Link
            to="/eval"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            AI Eval
          </Link>
        </li>
        <li>
          <Link
            to="/file-transcription"
            search={{ id: undefined }}
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            Audio Transcription
          </Link>
        </li>
        <li>
          <Link
            to="/oss-friends"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors no-underline hover:underline hover:decoration-dotted"
          >
            OSS Navigator
          </Link>
        </li>
      </ul>
    </div>
  );
}

function SocialLinks() {
  return (
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
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
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
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
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
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
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
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
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
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            YouTube
            <ExternalLinkIcon className="size-3" />
          </a>
        </li>
        <li>
          <a
            href="https://www.linkedin.com/company/hyprnote"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-600 hover:text-stone-600 transition-colors inline-flex items-center gap-1 no-underline hover:underline hover:decoration-dotted"
          >
            LinkedIn
            <ExternalLinkIcon className="size-3" />
          </a>
        </li>
      </ul>
    </div>
  );
}
