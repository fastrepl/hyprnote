import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import * as main from "../../../../../../store/tinybase/main";

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

function linkHumanToSession(
  store: any,
  userId: string,
  sessionId: string,
  humanId: string,
) {
  const mappingId = crypto.randomUUID();
  store.setRow("mapping_session_participant", mappingId, {
    user_id: userId,
    created_at: new Date().toISOString(),
    session_id: sessionId,
    human_id: humanId,
  });
}

function createAndLinkHuman(
  store: any,
  userId: string,
  sessionId: string,
  name: string,
) {
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

  return (
    <div className="flex flex-col gap-2">
      <div className="h-px bg-neutral-200" />
      <ParticipantChipInput sessionId={sessionId} mappingIds={mappingIds} />
    </div>
  );
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
    humanLinkedinUsername:
      (result.human_linkedin_username as string | undefined) || undefined,
    humanIsUser: result.human_is_user as boolean,
    orgId: (result.org_id as string | undefined) || undefined,
    orgName: result.org_name as string | undefined,
    sessionId: result.session_id as string,
  };
}

function parseHumanIdFromHintValue(value: unknown): string | undefined {
  const data =
    typeof value === "string"
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
        const hint = store.getRow("speaker_hints", hintId) as
          | main.SpeakerHintStorage
          | undefined;
        if (!hint || hint.type !== "user_speaker_assignment") {
          return;
        }

        const transcriptId = hint.transcript_id;
        if (typeof transcriptId !== "string") {
          return;
        }

        const transcript = store.getRow("transcripts", transcriptId) as
          | main.Transcript
          | undefined;
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

function ParticipantChip({ mappingId }: { mappingId: string }) {
  const details = useParticipantDetails(mappingId);

  const assignedHumanId = details?.humanId;
  const sessionId = details?.sessionId;

  const handleRemove = useRemoveParticipant({
    mappingId,
    assignedHumanId,
    sessionId,
  });

  if (!details) {
    return null;
  }

  const { humanName } = details;

  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted"
    >
      {humanName || "Unknown"}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-0.5 h-3 w-3 p-0 hover:bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          handleRemove();
        }}
      >
        <X className="h-2.5 w-2.5" />
      </Button>
    </Badge>
  );
}

function ParticipantChipInput({
  sessionId,
  mappingIds,
}: {
  sessionId: string;
  mappingIds: string[];
}) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const store = main.UI.useStore(main.STORE_ID);
  const userId = main.UI.useValue("user_id", main.STORE_ID);
  const allHumanIds = main.UI.useRowIds("humans", main.STORE_ID) as string[];
  const queries = main.UI.useQueries(main.STORE_ID);

  const existingHumanIds = useMemo(() => {
    if (!queries) {
      return new Set<string>();
    }

    const ids = new Set<string>();
    for (const mappingId of mappingIds) {
      const result = queries.getResultRow(
        main.QUERIES.sessionParticipantsWithDetails,
        mappingId,
      );
      if (result?.human_id) {
        ids.add(result.human_id as string);
      }
    }
    return ids;
  }, [mappingIds, queries]);

  const candidates = useMemo(() => {
    const searchLower = inputValue.toLowerCase();
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

        if (inputValue && !nameMatch && !emailMatch) {
          return null;
        }

        return {
          id: humanId,
          name,
          email,
          orgId: human.org_id as string | undefined,
          jobTitle: human.job_title as string | undefined,
          isNew: false,
        };
      })
      .filter((h): h is NonNullable<typeof h> => h !== null);
  }, [inputValue, allHumanIds, existingHumanIds, store]);

  const showCustomOption =
    inputValue.trim() &&
    !candidates.some((c) => c.name.toLowerCase() === inputValue.toLowerCase());

  const dropdownOptions = showCustomOption
    ? [
        {
          id: "new",
          name: inputValue.trim(),
          isNew: true,
          email: "",
          orgId: undefined,
          jobTitle: undefined,
        },
        ...candidates,
      ]
    : candidates;

  const handleAddParticipant = useCallback(
    (option: {
      id: string;
      name: string;
      isNew?: boolean;
      email?: string;
      orgId?: string;
      jobTitle?: string;
    }) => {
      if (!store || !userId) {
        return;
      }

      if (option.isNew) {
        createAndLinkHuman(store, userId, sessionId, option.name);
      } else {
        linkHumanToSession(store, userId, sessionId, option.id);
      }

      setInputValue("");
      setShowDropdown(false);
      setSelectedIndex(0);
    },
    [store, userId, sessionId],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (dropdownOptions.length > 0) {
        handleAddParticipant(dropdownOptions[selectedIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < dropdownOptions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setSelectedIndex(0);
    } else if (e.key === "Backspace" && !inputValue && mappingIds.length > 0) {
      const lastMappingId = mappingIds[mappingIds.length - 1];
      if (store) {
        store.delRow("mapping_session_participant", lastMappingId);
      }
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setShowDropdown(true);
    setSelectedIndex(0);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="min-h-[38px] w-full flex flex-wrap items-center gap-2 rounded-md border p-2 cursor-text bg-neutral-50"
        onClick={() => inputRef.current?.focus()}
      >
        {mappingIds.map((mappingId) => (
          <ParticipantChip key={mappingId} mappingId={mappingId} />
        ))}
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-neutral-400"
          placeholder={mappingIds.length === 0 ? "Add participants..." : ""}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
        />
      </div>
      {showDropdown && inputValue.trim() && dropdownOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md overflow-hidden">
          <div className="max-h-[200px] overflow-auto py-1">
            {dropdownOptions.map((option, index) => (
              <button
                key={option.id}
                type="button"
                className={cn([
                  "w-full px-3 py-1.5 text-left text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  selectedIndex === index && "bg-accent text-accent-foreground",
                ])}
                onClick={() => handleAddParticipant(option)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {option.isNew ? (
                  <span>
                    Add "<span className="font-medium">{option.name}</span>"
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{option.name}</span>
                    {option.jobTitle && (
                      <span className="text-xs text-muted-foreground">
                        {option.jobTitle}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
