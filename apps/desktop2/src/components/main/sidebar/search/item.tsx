import DOMPurify from "dompurify";
import { useCallback, useMemo } from "react";

import { cn } from "@hypr/ui/lib/utils";
import { type SearchResult } from "../../../../contexts/search";
import * as persisted from "../../../../store/tinybase/persisted";
import { Tab, useTabs } from "../../../../store/zustand/tabs";
import { getInitials } from "../../body/contacts/shared";

export function SearchResultItem({ result }: { result: SearchResult }) {
  const { openCurrent } = useTabs();

  const handleClick = useCallback(() => {
    const tab = getTab(result);
    if (tab) {
      openCurrent(tab);
    }
  }, [openCurrent, result]);

  if (result.type === "human") {
    return <HumanSearchResultItem result={result} onClick={handleClick} />;
  }

  if (result.type === "organization") {
    return <OrganizationSearchResultItem result={result} onClick={handleClick} />;
  }

  if (result.type === "session") {
    return <SessionSearchResultItem result={result} onClick={handleClick} />;
  }

  return null;
}

function HumanSearchResultItem({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const organization = persisted.UI.useRow("organizations", result.org_id, persisted.STORE_ID);

  const sanitizedTitle = useMemo(
    () => DOMPurify.sanitize(result.titleHighlighted, { ALLOWED_TAGS: ["mark"], ALLOWED_ATTR: [] }),
    [result.titleHighlighted],
  );

  const jobTitle = result.metadata?.job_title as string | undefined;
  const orgName = organization?.name;

  const subtitle = [jobTitle, orgName].filter(Boolean).join(", ");

  return (
    <button
      onClick={onClick}
      className={cn([
        "w-full px-3 py-2.5",
        "flex items-start gap-3",
        "hover:bg-gray-50 active:bg-gray-100",
        "rounded-lg transition-colors",
        "text-left",
      ])}
    >
      <div className={cn(["flex-shrink-0 w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center"])}>
        <span className={cn(["text-xs font-medium text-neutral-600"])}>
          {getInitials(result.title)}
        </span>
      </div>
      <div className={cn(["flex-1 min-w-0"])}>
        <div
          className={cn(["text-sm font-medium text-gray-900 truncate [&_mark]:bg-transparent [&_mark]:font-semibold"])}
          dangerouslySetInnerHTML={{ __html: sanitizedTitle }}
        />
        {subtitle && (
          <div className={cn(["text-xs text-gray-500 truncate mt-0.5"])}>
            {subtitle}
          </div>
        )}
      </div>
    </button>
  );
}

function OrganizationSearchResultItem({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const humanIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.humansByOrg,
    result.id,
    persisted.STORE_ID,
  );

  const sanitizedTitle = useMemo(
    () => DOMPurify.sanitize(result.titleHighlighted, { ALLOWED_TAGS: ["mark"], ALLOWED_ATTR: [] }),
    [result.titleHighlighted],
  );

  const memberCount = humanIds.length;
  const memberText = memberCount === 1 ? "1 person" : `${memberCount} people`;

  return (
    <button
      onClick={onClick}
      className={cn([
        "w-full px-3 py-2.5",
        "flex items-start gap-3",
        "hover:bg-gray-50 active:bg-gray-100",
        "rounded-lg transition-colors",
        "text-left",
      ])}
    >
      <div className={cn(["flex-1 min-w-0"])}>
        <div
          className={cn(["text-sm font-medium text-gray-900 truncate [&_mark]:bg-transparent [&_mark]:font-semibold"])}
          dangerouslySetInnerHTML={{ __html: sanitizedTitle }}
        />
        <div className={cn(["text-xs text-gray-500 truncate mt-0.5"])}>
          {memberText}
        </div>
      </div>
    </button>
  );
}

function SessionSearchResultItem({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const sanitizedTitle = useMemo(
    () => DOMPurify.sanitize(result.titleHighlighted, { ALLOWED_TAGS: ["mark"], ALLOWED_ATTR: [] }),
    [result.titleHighlighted],
  );

  const sanitizedContent = useMemo(
    () => DOMPurify.sanitize(result.contentHighlighted.slice(0, 200), { ALLOWED_TAGS: ["mark"], ALLOWED_ATTR: [] }),
    [result.contentHighlighted],
  );

  const createdAt = new Date(result.created_at);
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let timeAgo: string;
  if (diffDays === 0) {
    timeAgo = "Today";
  } else if (diffDays === 1) {
    timeAgo = "Yesterday";
  } else if (diffDays < 7) {
    timeAgo = createdAt.toLocaleDateString("en-US", { weekday: "long" });
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    timeAgo = weeks === 1 ? "a week ago" : `${weeks} weeks ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    timeAgo = months === 1 ? "a month ago" : `${months} months ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    timeAgo = years === 1 ? "a year ago" : `${years} years ago`;
  }

  return (
    <button
      onClick={onClick}
      className={cn([
        "w-full px-3 py-2.5",
        "flex flex-col gap-1",
        "hover:bg-gray-50 active:bg-gray-100",
        "rounded-lg transition-colors",
        "text-left",
        "min-w-0",
      ])}
    >
      <div
        className={cn([
          "text-sm font-medium text-gray-900 truncate [&_mark]:bg-transparent [&_mark]:font-semibold",
          "w-full",
        ])}
        dangerouslySetInnerHTML={{ __html: sanitizedTitle }}
      />
      <div className={cn(["text-xs text-gray-500"])}>
        {timeAgo}
      </div>
      {result.content && (
        <div
          className={cn([
            "text-xs text-gray-500 line-clamp-2 [&_mark]:bg-transparent [&_mark]:font-semibold [&_mark]:text-gray-900",
          ])}
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      )}
    </button>
  );
}

function getTab(result: SearchResult): Tab | null {
  if (result.type === "session") {
    return { type: "sessions", active: true, id: result.id, state: { editor: "raw" } };
  }
  if (result.type === "human") {
    return { type: "humans", active: true, id: result.id };
  }
  if (result.type === "organization") {
    return { type: "organizations", active: true, id: result.id };
  }

  return null;
}
