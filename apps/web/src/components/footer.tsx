import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRightIcon, ExternalLinkIcon, MailIcon } from "lucide-react";
import { useState } from "react";

import { Checkbox } from "@hypr/ui/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
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
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [subscriptions, setSubscriptions] = useState({
    releaseNotesStable: false,
    releaseNotesBeta: false,
    newsletter: false,
  });

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
      setPopoverOpen(true);
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
      <p className="text-sm text-neutral-600 mb-3">
        Are you in back-to-back meetings?{" "}
        <Link
          to="/auth"
          className="text-neutral-600 hover:text-stone-600 transition-colors underline decoration-solid"
        >
          Get started
        </Link>
      </p>

      <div className="mb-4">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="flex items-center gap-2"
            >
              <form.Field name="email">
                {(field) => (
                  <div className="relative flex-1 max-w-[220px]">
                    <MailIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400" />
                    <input
                      type="email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Subscribe to updates"
                      className={cn([
                        "w-full pl-8 pr-3 py-1.5 text-sm",
                        "border border-neutral-200 rounded-md",
                        "bg-white placeholder:text-neutral-400",
                        "focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400",
                        "transition-all",
                      ])}
                      required
                    />
                  </div>
                )}
              </form.Field>
              <button
                type="submit"
                className={cn([
                  "p-1.5 rounded-md",
                  "bg-stone-600 text-white",
                  "hover:bg-stone-700 transition-colors",
                  "focus:outline-none focus:ring-1 focus:ring-stone-400",
                ])}
              >
                <ArrowRightIcon className="size-3.5" />
              </button>
            </form>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-72 p-4 bg-white border border-neutral-200 shadow-lg"
          >
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-900 mb-1">
                  What would you like to receive?
                </p>
                <p className="text-xs text-neutral-500">
                  Select your preferences for {email}
                </p>
              </div>

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
                    />
                    <div className="flex flex-col">
                      <span className="text-sm text-neutral-600">
                        Subscribe to newsletter
                      </span>
                      <span className="text-xs text-neutral-400">
                        About notetaking, opensource, and AI
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <button
                onClick={() => mutation.mutate()}
                disabled={!hasSelection || mutation.isPending}
                className={cn([
                  "w-full py-2 px-4 text-sm font-medium rounded-md transition-all",
                  hasSelection
                    ? "bg-stone-600 text-white hover:bg-stone-700"
                    : "bg-neutral-100 text-neutral-400 cursor-not-allowed",
                  mutation.isPending && "opacity-50 cursor-wait",
                ])}
              >
                {mutation.isPending
                  ? "Subscribing..."
                  : mutation.isSuccess
                    ? "Subscribed!"
                    : "Subscribe"}
              </button>

              {mutation.isError && (
                <p className="text-xs text-red-500">
                  Something went wrong. Please try again.
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
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
