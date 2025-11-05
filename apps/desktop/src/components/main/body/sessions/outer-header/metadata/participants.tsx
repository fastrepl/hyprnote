import { CircleMinus, CornerDownLeft, Linkedin, MailIcon, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { cn } from "@hypr/utils";
import * as main from "../../../../../../store/tinybase/main";
import { useTabs } from "../../../../../../store/zustand/tabs";

const NO_ORGANIZATION_ID = "__NO_ORGANIZATION__";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function createHuman(store: any, userId: string, name: string) {
  const humanId = crypto.randomUUID();
  store.setRow("humans", humanId, {
    user_id: userId,
    created_at: new Date().toISOString(),
    name,
    email: "",
    org_id: "",
    job_title: "",
    linkedin_username: "",
    is_user: false,
    memo: "",
  });
  return humanId;
}

function linkHumanToSession(store: any, userId: string, sessionId: string, humanId: string) {
  const mappingId = crypto.randomUUID();
  store.setRow("mapping_session_participant", mappingId, {
    user_id: userId,
    created_at: new Date().toISOString(),
    session_id: sessionId,
    human_id: humanId,
  });
}

function createAndLinkHuman(store: any, userId: string, sessionId: string, name: string) {
  const humanId = createHuman(store, userId, name);
  linkHumanToSession(store, userId, sessionId, humanId);
  return humanId;
}

export function ParticipantsDisplay({ sessionId }: { sessionId: string }) {
  const mappingIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionParticipantsBySession,
    sessionId,
    main.STORE_ID,
  ) as string[];

  const grouped = useGroupedParticipants(sessionId);

  if (mappingIds.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-px bg-neutral-200" />
        <ParticipantAddControl sessionId={sessionId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="h-px bg-neutral-200" />
      <div className="flex flex-col gap-4 max-h-[40vh] overflow-y-auto pr-1">
        {grouped.map(({ orgId, orgName, mappingIds }) => (
          <div key={orgId} className="flex flex-col gap-1.5">
            <div className="text-xs font-medium text-neutral-400 truncate">
              {orgName ?? "No organization"}
            </div>
            <div className="flex flex-col rounded-md overflow-hidden bg-neutral-50 border border-neutral-100">
              {mappingIds.map((mappingId) => <ParticipantItem key={mappingId} mappingId={mappingId} />)}
            </div>
          </div>
        ))}
      </div>
      <ParticipantAddControl sessionId={sessionId} />
    </div>
  );
}

function useGroupedParticipants(sessionId: string) {
  const mappingIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionParticipantsBySession,
    sessionId,
    main.STORE_ID,
  ) as string[];

  const queries = main.UI.useQueries(main.STORE_ID);

  return useMemo(() => {
    if (!queries) {
      return [];
    }

    const participantsByOrg: Record<
      string,
      { mappingId: string; orgId: string | undefined; orgName: string | undefined }[]
    > = {};

    for (const mappingId of mappingIds) {
      const result = queries.getResultRow(
        main.QUERIES.sessionParticipantsWithDetails,
        mappingId,
      );

      if (!result) {
        continue;
      }

      const orgId = (result.org_id as string | undefined) || undefined;
      const orgName = result.org_name as string | undefined;

      const key = orgId ?? NO_ORGANIZATION_ID;
      if (!participantsByOrg[key]) {
        participantsByOrg[key] = [];
      }
      participantsByOrg[key].push({ mappingId, orgId, orgName });
    }

    return Object.entries(participantsByOrg)
      .map(([orgId, items]) => ({
        orgId,
        orgName: items[0]?.orgName,
        mappingIds: items.map((item) => item.mappingId),
      }))
      .sort((a, b) => {
        if (!a.orgName && b.orgName) {
          return 1;
        }
        if (a.orgName && !b.orgName) {
          return -1;
        }
        return (a.orgName || "").localeCompare(b.orgName || "");
      });
  }, [mappingIds, queries]);
}

function useParticipantDetails(mappingId: string) {
  const result = main.UI.useResultRow(
    main.QUERIES.sessionParticipantsWithDetails,
    mappingId,
    main.STORE_ID,
  );

  if (!result) {
    return null;
  }

  return {
    mappingId,
    humanId: result.human_id as string,
    humanName: (result.human_name as string) || "",
    humanEmail: (result.human_email as string | undefined) || undefined,
    humanJobTitle: (result.human_job_title as string | undefined) || undefined,
    humanLinkedinUsername: (result.human_linkedin_username as string | undefined) || undefined,
    humanIsUser: result.human_is_user as boolean,
    orgId: (result.org_id as string | undefined) || undefined,
    orgName: result.org_name as string | undefined,
    sessionId: result.session_id as string,
  };
}

function parseHumanIdFromHintValue(value: unknown): string | undefined {
  const data = typeof value === "string"
    ? (() => {
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    })()
    : value;

  if (data && typeof data === "object" && "human_id" in data) {
    const humanId = (data as Record<string, unknown>).human_id;
    return typeof humanId === "string" ? humanId : undefined;
  }

  return undefined;
}

function useRemoveParticipant({
  mappingId,
  assignedHumanId,
  sessionId,
}: {
  mappingId: string;
  assignedHumanId: string | undefined;
  sessionId: string | undefined;
}) {
  const store = main.UI.useStore(main.STORE_ID);

  return useCallback(() => {
    if (!store) {
      return;
    }

    if (assignedHumanId && sessionId) {
      const hintIdsToDelete: string[] = [];

      store.forEachRow("speaker_hints", (hintId, _forEachCell) => {
        const hint = store.getRow("speaker_hints", hintId) as main.SpeakerHintStorage | undefined;
        if (!hint || hint.type !== "user_speaker_assignment") {
          return;
        }

        const transcriptId = hint.transcript_id;
        if (typeof transcriptId !== "string") {
          return;
        }

        const transcript = store.getRow("transcripts", transcriptId) as main.Transcript | undefined;
        if (!transcript || transcript.session_id !== sessionId) {
          return;
        }

        const hintHumanId = parseHumanIdFromHintValue(hint.value);
        if (hintHumanId === assignedHumanId) {
          hintIdsToDelete.push(hintId);
        }
      });

      hintIdsToDelete.forEach((hintId) => {
        store.delRow("speaker_hints", hintId);
      });
    }

    store.delRow("mapping_session_participant", mappingId);
  }, [store, mappingId, assignedHumanId, sessionId]);
}

function ParticipantItem({ mappingId }: { mappingId: string }) {
  const userId = main.UI.useValue("user_id", main.STORE_ID);
  const details = useParticipantDetails(mappingId);
  const { tabs, openNew, updateContactsTabState, select } = useTabs();

  const assignedHumanId = details?.humanId;
  const sessionId = details?.sessionId;

  const handleRemove = useRemoveParticipant({ mappingId, assignedHumanId, sessionId });

  const handleOpenContact = useCallback((humanId: string) => {
    const existingContactsTab = tabs.find((tab) => tab.type === "contacts");

    if (existingContactsTab) {
      updateContactsTabState(existingContactsTab, { selectedPerson: humanId, selectedOrganization: null });
      select(existingContactsTab);
    } else {
      openNew({ type: "contacts", state: { selectedPerson: humanId } });
    }
  }, [tabs, updateContactsTabState, select, openNew]);

  if (!details) {
    return null;
  }

  const { humanId, humanName, humanEmail, humanJobTitle, humanLinkedinUsername } = details;

  return (
    <div
      onClick={() => handleOpenContact(humanId)}
      className={cn([
        "flex items-center justify-between gap-2 py-2 px-3",
        "hover:bg-neutral-100 cursor-pointer group transition-colors",
      ])}
    >
      <div className="flex items-center gap-2.5 relative min-w-0">
        <div className="relative size-7 flex items-center justify-center flex-shrink-0">
          <div
            className={cn([
              "absolute inset-0 flex items-center justify-center transition-opacity",
              "group-hover:opacity-0",
            ])}
          >
            <Avatar className="size-7">
              <AvatarFallback className="text-xs bg-neutral-200 text-neutral-700 font-medium">
                {humanName ? getInitials(humanName) : "?"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                handleRemove();
              }
            }}
            className={cn([
              "flex items-center justify-center",
              "text-red-400 hover:text-red-600",
              "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
              "bg-white shadow-sm",
            ])}
          >
            <CircleMinus className="size-4" />
          </div>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          {humanName
            ? (
              <span className="text-sm font-medium text-neutral-700 truncate">
                {humanName}
              </span>
            )
            : (
              <span className="text-sm font-medium text-neutral-400">
                {humanId === userId ? "You" : "Unknown"}
              </span>
            )}
          {humanJobTitle && (
            <span className="text-xs text-neutral-400 truncate">
              {humanJobTitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 transition-colors flex-shrink-0">
        {humanEmail && (
          <a
            href={`mailto:${humanEmail}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 transition-colors hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <MailIcon className="size-3.5" />
          </a>
        )}
        {humanLinkedinUsername && (
          <a
            href={(() => {
              const username = humanLinkedinUsername;
              if (
                username.startsWith("https://")
                || username.startsWith("www.linkedin.com")
                || username.startsWith("linkedin.com")
              ) {
                return username;
              }
              return `https://linkedin.com/in/${username}`;
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 transition-colors hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Linkedin className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function ParticipantAddControl({ sessionId }: { sessionId: string }) {
  const [searchInput, setSearchInput] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const store = main.UI.useStore(main.STORE_ID);
  const userId = main.UI.useValue("user_id", main.STORE_ID);

  const normalizedQuery = searchInput.trim();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleCreateNew = useCallback((name: string) => {
    if (!store || !userId) {
      return;
    }

    createAndLinkHuman(store, userId, sessionId, name);
    setSearchInput("");
  }, [store, userId, sessionId]);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (normalizedQuery === "") {
      return;
    }

    handleCreateNew(normalizedQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && selectedIndex === -1) {
      e.preventDefault();
      if (normalizedQuery === "") {
        return;
      }
      handleCreateNew(normalizedQuery);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-neutral-50 border border-neutral-200">
          <span className="text-neutral-500 flex-shrink-0">
            <SearchIcon className="size-4" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find person"
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
          />
          {normalizedQuery && (
            <button
              type="submit"
              className="text-neutral-500 hover:text-neutral-700 transition-colors flex-shrink-0"
              aria-label="Find person"
            >
              <CornerDownLeft className="size-4" />
            </button>
          )}
        </div>
        <ParticipantCandidates
          query={normalizedQuery}
          sessionId={sessionId}
          onMutation={() => {
            setSearchInput("");
            setSelectedIndex(-1);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          selectedIndex={selectedIndex}
          onSelectedIndexChange={setSelectedIndex}
          inputRef={inputRef}
        />
      </div>
    </form>
  );
}

function useParticipantCandidateKeyboardNav({
  query,
  sessionId,
  selectedIndex,
  onSelectedIndexChange,
  totalItems,
  candidateCount,
  candidates,
  onMutation,
  inputRef,
  store,
  userId,
}: {
  query: string;
  sessionId: string;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  totalItems: number;
  candidateCount: number;
  candidates: Array<{ id: string; name: string }>;
  onMutation: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  store: any;
  userId: string | undefined;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!query || totalItems === 0) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        onSelectedIndexChange(selectedIndex < totalItems - 1 ? selectedIndex + 1 : 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onSelectedIndexChange(selectedIndex > 0 ? selectedIndex - 1 : totalItems - 1);
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        if (selectedIndex < candidateCount) {
          const candidate = candidates[selectedIndex];
          if (candidate && userId && store) {
            linkHumanToSession(store, userId, sessionId, candidate.id);
            onMutation();
          }
        } else {
          if (store && userId) {
            createAndLinkHuman(store, userId, sessionId, query);
            onMutation();
          }
        }
      } else if (e.key === "Escape") {
        onSelectedIndexChange(-1);
        inputRef.current?.focus();
      }
    };

    if (inputRef.current === document.activeElement && totalItems > 0) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [
    selectedIndex,
    totalItems,
    candidateCount,
    query,
    candidates,
    onSelectedIndexChange,
    onMutation,
    inputRef,
    sessionId,
    store,
    userId,
  ]);

  useEffect(() => {
    onSelectedIndexChange(-1);
  }, [query, onSelectedIndexChange]);
}

function ParticipantCandidates({
  query,
  sessionId,
  onMutation,
  selectedIndex,
  onSelectedIndexChange,
  inputRef,
}: {
  query: string;
  sessionId: string;
  onMutation: () => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const store = main.UI.useStore(main.STORE_ID);
  const userId = main.UI.useValue("user_id", main.STORE_ID);
  const allHumanIds = main.UI.useRowIds("humans", main.STORE_ID) as string[];
  const existingParticipantIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionParticipantsBySession,
    sessionId,
    main.STORE_ID,
  ) as string[];

  const queries = main.UI.useQueries(main.STORE_ID);

  const existingHumanIds = useMemo(() => {
    if (!queries) {
      return new Set<string>();
    }

    const ids = new Set<string>();
    for (const mappingId of existingParticipantIds) {
      const result = queries.getResultRow(
        main.QUERIES.sessionParticipantsWithDetails,
        mappingId,
      );
      if (result?.human_id) {
        ids.add(result.human_id as string);
      }
    }
    return ids;
  }, [existingParticipantIds, queries]);

  const candidates = useMemo(() => {
    if (!query) {
      return [];
    }

    const searchLower = query.toLowerCase();
    return allHumanIds
      .filter((humanId: string) => !existingHumanIds.has(humanId))
      .map((humanId: string) => {
        const human = store?.getRow("humans", humanId);
        if (!human) {
          return null;
        }

        const name = (human.name || "") as string;
        const email = (human.email || "") as string;
        const nameMatch = name.toLowerCase().includes(searchLower);
        const emailMatch = email.toLowerCase().includes(searchLower);

        if (!nameMatch && !emailMatch) {
          return null;
        }

        return {
          id: humanId,
          name,
          email,
          orgId: human.org_id as string | undefined,
          jobTitle: human.job_title as string | undefined,
        };
      })
      .filter((h): h is NonNullable<typeof h> => h !== null);
  }, [query, allHumanIds, existingHumanIds, store]);

  const candidateCount = candidates.length;
  const hasCreateOption = candidateCount === 0 && query;
  const totalItems = candidateCount + (hasCreateOption ? 1 : 0);

  useParticipantCandidateKeyboardNav({
    query,
    sessionId,
    selectedIndex,
    onSelectedIndexChange,
    totalItems,
    candidateCount,
    candidates,
    onMutation,
    inputRef,
    store,
    userId,
  });

  const handleCreateClick = useCallback(() => {
    if (!store || !userId) {
      return;
    }

    createAndLinkHuman(store, userId, sessionId, query);
    onMutation();
  }, [store, userId, sessionId, query, onMutation]);

  const handleSelectCandidate = useCallback((candidateId: string) => {
    if (!store || !userId) {
      return;
    }

    linkHumanToSession(store, userId, sessionId, candidateId);
    onMutation();
  }, [store, userId, sessionId, onMutation]);

  if (!query) {
    return null;
  }

  return (
    <div className="flex flex-col w-full rounded border border-neutral-200 overflow-hidden">
      {candidates.map((candidate: {
        id: string;
        name: string;
        email: string;
        orgId: string | undefined;
        jobTitle: string | undefined;
      }, index: number) => (
        <ParticipantCandidate
          key={candidate.id}
          candidate={candidate}
          isSelected={selectedIndex === index}
          onSelect={() => handleSelectCandidate(candidate.id)}
        />
      ))}

      {hasCreateOption && (
        <button
          type="button"
          className={cn([
            "flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full",
            selectedIndex === candidateCount && "bg-neutral-100",
          ])}
          onClick={handleCreateClick}
        >
          <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-neutral-200 rounded-full">
            <span className="text-xs">+</span>
          </span>
          <span className="flex items-center gap-1 font-medium text-neutral-600">
            Create
            <span className="text-neutral-900 truncate max-w-[140px]">&quot;{query}&quot;</span>
          </span>
        </button>
      )}
    </div>
  );
}

function ParticipantCandidate({
  candidate,
  isSelected = false,
  onSelect,
}: {
  candidate: {
    id: string;
    name: string;
    email: string;
    orgId: string | undefined;
    jobTitle: string | undefined;
  };
  isSelected?: boolean;
  onSelect: () => void;
}) {
  const org = candidate.orgId
    ? main.UI.useRow("organizations", candidate.orgId, main.STORE_ID)
    : undefined;

  return (
    <button
      type="button"
      className={cn([
        "flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full",
        isSelected && "bg-neutral-100",
      ])}
      onClick={onSelect}
    >
      <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-neutral-100 rounded-full">
        <span className="text-xs">{candidate.name ? getInitials(candidate.name) : "?"}</span>
      </span>
      <span className="font-medium truncate max-w-[180px]">{candidate.name}</span>

      <div className="flex gap-0 items-center justify-between flex-1 min-w-0">
        {org?.name && (
          <span className="text-xs text-neutral-400 ml-auto truncate max-w-[110px]">
            {[candidate.jobTitle, org.name].filter(Boolean).join(", ")}
          </span>
        )}
      </div>
    </button>
  );
}
