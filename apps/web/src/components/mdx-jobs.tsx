"use client";

import { Icon } from "@iconify-icon/react";
import { ChevronDown } from "lucide-react";

import { AnimatedText } from "./animated-text";

export function ToolIcon({
  icon,
  className = "",
}: {
  icon: string;
  className?: string;
}) {
  return (
    <Icon
      icon={icon}
      className={`inline-block align-middle mb-1 ${className}`}
    />
  );
}

export function ToolImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={`inline-block align-middle ${className}`}
    />
  );
}

const TOOL_CONFIG: Record<
  string,
  { icon?: string; image?: { src: string; className: string } }
> = {
  tauri: { icon: "logos:tauri" },
  rust: { icon: "logos:rust" },
  typescript: { icon: "logos:typescript-icon" },
  zed: { icon: "devicon:zed" },
  cursor: { icon: "simple-icons:cursor" },
  claude: { icon: "logos:claude-icon" },
  devin: {
    image: {
      src: "https://mintcdn.com/cognitionai/k89q9Lsp7DOurdC0/logo/devin.png?fit=max&auto=format&n=k89q9Lsp7DOurdC0&q=85&s=e83fbc727ea2cae8f1b80442fa772c50",
      className: "size-5 -mx-1 mb-0.75",
    },
  },
  graphite: { icon: "simple-icons:graphite" },
  gitbutler: {
    image: {
      src: "https://dl.flathub.org/media/com/gitbutler/gitbutler/86fc196ac5615bc7ed82d530d29309c9/icons/128x128@2/com.gitbutler.gitbutler.png",
      className: "size-5 -mx-0.5 mb-0.5",
    },
  },
  figma: { icon: "logos:figma" },
  slack: { icon: "logos:slack-icon" },
  github: { icon: "logos:github-icon" },
  hyprnote: {
    image: {
      src: "/api/images/hyprnote/icon.png",
      className: "size-5 -mx-0.5 mb-0.5 rounded",
    },
  },
};

const TOOL_NAMES: Record<string, string> = {
  tauri: "Tauri",
  rust: "Rust",
  typescript: "TypeScript",
  zed: "Zed",
  cursor: "Cursor",
  claude: "Claude Code",
  devin: "Devin",
  graphite: "Graphite",
  gitbutler: "GitButler",
  figma: "Figma",
  slack: "Slack",
  github: "GitHub",
  hyprnote: "Hyprnote",
};

function ToolWithIcon({ tool }: { tool: string }) {
  const config = TOOL_CONFIG[tool];
  const name = TOOL_NAMES[tool] || tool;

  if (!config) {
    return <span>{name}</span>;
  }

  if (config.icon) {
    return (
      <>
        <Icon icon={config.icon} className="inline-block align-middle mb-1" />{" "}
        {name}
      </>
    );
  }

  if (config.image) {
    return (
      <>
        <img
          src={config.image.src}
          alt={name}
          className={`inline-block align-middle ${config.image.className}`}
        />{" "}
        {name}
      </>
    );
  }

  return <span>{name}</span>;
}

export function ToolStack({ tools }: { tools: string[] }) {
  return (
    <p className="text-neutral-600">
      Stack:{" "}
      {tools.map((tool, index) => (
        <span key={tool}>
          <ToolWithIcon tool={tool} />
          {index < tools.length - 1 && ", "}
        </span>
      ))}
      .
    </p>
  );
}

export function EditorStack({ tools }: { tools: string[] }) {
  return (
    <p className="text-neutral-600">
      Editors like{" "}
      {tools.map((tool, index) => (
        <span key={tool}>
          <ToolWithIcon tool={tool} />
          {index < tools.length - 1 && " and "}
        </span>
      ))}
      .
    </p>
  );
}

export function AIToolStack({ tools }: { tools: string[] }) {
  return (
    <p className="text-neutral-600">
      AI tools like{" "}
      {tools.map((tool, index) => (
        <span key={tool}>
          <ToolWithIcon tool={tool} />
          {index < tools.length - 1 && " and "}
        </span>
      ))}
      .
    </p>
  );
}

export function GitToolStack({ tools }: { tools: string[] }) {
  return (
    <p className="text-neutral-600">
      Git workflows via{" "}
      {tools.map((tool, index) => (
        <span key={tool}>
          <ToolWithIcon tool={tool} />
          {index < tools.length - 1 && " and "}
        </span>
      ))}
      .
    </p>
  );
}

export function AnimatedJobText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return <AnimatedText text={text} className={className} />;
}

export function GitHubMention({ username }: { username: string }) {
  const avatarUrl = `https://github.com/${username}.png?size=48`;
  const profileUrl = `https://github.com/${username}`;

  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "inline-flex items-center gap-1 align-middle",
        "font-semibold text-inherit",
        "underline underline-offset-2 decoration-neutral-400",
        "hover:decoration-neutral-600 transition-colors",
      ].join(" ")}
    >
      <img
        src={avatarUrl}
        alt={username}
        className="size-5 rounded-full no-underline"
      />
      @{username}
    </a>
  );
}

export function HyprnoteIcon() {
  return (
    <img
      src="/api/images/hyprnote/icon.png"
      alt="Hyprnote"
      className="inline-block align-middle size-5 -mx-0.5 mb-0.5 rounded"
    />
  );
}

export function ChevronIcon() {
  return (
    <ChevronDown className="size-4 text-neutral-400 group-open:rotate-180 transition-transform" />
  );
}

export const jobsMdxComponents = {
  ToolIcon,
  ToolImage,
  ToolStack,
  EditorStack,
  AIToolStack,
  GitToolStack,
  AnimatedJobText,
  GitHubMention,
  HyprnoteIcon,
  ChevronIcon,
};
