import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  EnhancedNoteStorage,
  HumanStorage,
  OrganizationStorage,
  SessionStorage,
  TemplateStorage,
} from "@hypr/store";

import {
  ensureSessionContentLoaded,
  isSessionContentLoaded,
  isSessionContentLoading,
} from "../store/tinybase/persister/session/ops";
import * as main from "../store/tinybase/store/main";

export function useSession(sessionId: string) {
  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);
  const rawMd = main.UI.useCell("sessions", sessionId, "raw_md", main.STORE_ID);
  const createdAt = main.UI.useCell(
    "sessions",
    sessionId,
    "created_at",
    main.STORE_ID,
  );
  const eventId = main.UI.useCell(
    "sessions",
    sessionId,
    "event_id",
    main.STORE_ID,
  );
  const folderId = main.UI.useCell(
    "sessions",
    sessionId,
    "folder_id",
    main.STORE_ID,
  );

  return useMemo(
    () => ({ title, rawMd, createdAt, eventId, folderId }),
    [title, rawMd, createdAt, eventId, folderId],
  );
}

export function useSetSessionTitle() {
  const store = main.UI.useStore(main.STORE_ID);

  return useCallback(
    (sessionId: string, title: string) => {
      if (!store) return;
      store.setPartialRow("sessions", sessionId, { title });
    },
    [store],
  );
}

export function useSetSessionRawMd() {
  const store = main.UI.useStore(main.STORE_ID);

  return useCallback(
    (sessionId: string, rawMd: string) => {
      if (!store) return;
      store.setPartialRow("sessions", sessionId, { raw_md: rawMd });
    },
    [store],
  );
}

export function useHuman(humanId: string) {
  const name = main.UI.useCell("humans", humanId, "name", main.STORE_ID);
  const email = main.UI.useCell("humans", humanId, "email", main.STORE_ID);
  const orgId = main.UI.useCell("humans", humanId, "org_id", main.STORE_ID);
  const jobTitle = main.UI.useCell(
    "humans",
    humanId,
    "job_title",
    main.STORE_ID,
  );
  const linkedinUsername = main.UI.useCell(
    "humans",
    humanId,
    "linkedin_username",
    main.STORE_ID,
  );

  return useMemo(
    () => ({ name, email, orgId, jobTitle, linkedinUsername }),
    [name, email, orgId, jobTitle, linkedinUsername],
  );
}

export function useOrganization(orgId: string) {
  const name = main.UI.useCell("organizations", orgId, "name", main.STORE_ID);

  return useMemo(() => ({ name }), [name]);
}

export function useEvent(eventId: string | undefined) {
  const title = main.UI.useCell(
    "events",
    eventId ?? "",
    "title",
    main.STORE_ID,
  );
  const startedAt = main.UI.useCell(
    "events",
    eventId ?? "",
    "started_at",
    main.STORE_ID,
  );
  const endedAt = main.UI.useCell(
    "events",
    eventId ?? "",
    "ended_at",
    main.STORE_ID,
  );
  const location = main.UI.useCell(
    "events",
    eventId ?? "",
    "location",
    main.STORE_ID,
  );
  const meetingLink = main.UI.useCell(
    "events",
    eventId ?? "",
    "meeting_link",
    main.STORE_ID,
  );
  const description = main.UI.useCell(
    "events",
    eventId ?? "",
    "description",
    main.STORE_ID,
  );
  const calendarId = main.UI.useCell(
    "events",
    eventId ?? "",
    "calendar_id",
    main.STORE_ID,
  );

  return useMemo(
    () =>
      eventId
        ? {
            title,
            startedAt,
            endedAt,
            location,
            meetingLink,
            description,
            calendarId,
          }
        : null,
    [
      eventId,
      title,
      startedAt,
      endedAt,
      location,
      meetingLink,
      description,
      calendarId,
    ],
  );
}

/**
 * Hook to ensure session content is loaded (lazy loading).
 * Triggers content loading when the session is accessed.
 * Returns loading state so components can show loading indicators.
 */
export function useSessionContentLoader(sessionId: string) {
  const [isLoading, setIsLoading] = useState(() =>
    isSessionContentLoading(sessionId),
  );
  const [isLoaded, setIsLoaded] = useState(() =>
    isSessionContentLoaded(sessionId),
  );

  useEffect(() => {
    if (!sessionId) return;

    // Check current state
    const loaded = isSessionContentLoaded(sessionId);
    const loading = isSessionContentLoading(sessionId);

    setIsLoaded(loaded);
    setIsLoading(loading);

    // If not loaded and not loading, trigger load
    if (!loaded && !loading) {
      setIsLoading(true);
      ensureSessionContentLoaded(sessionId)
        .then(() => {
          setIsLoaded(true);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error(
            `Failed to load session content for ${sessionId}:`,
            error,
          );
          setIsLoading(false);
        });
    }
  }, [sessionId]);

  return { isLoading, isLoaded };
}

/**
 * Hook for session metadata only (lightweight, always available).
 * Use this for session lists, timelines, etc. where content is not needed.
 */
export function useSessionMetadata(sessionId: string) {
  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);
  const createdAt = main.UI.useCell(
    "sessions",
    sessionId,
    "created_at",
    main.STORE_ID,
  );
  const eventId = main.UI.useCell(
    "sessions",
    sessionId,
    "event_id",
    main.STORE_ID,
  );
  const folderId = main.UI.useCell(
    "sessions",
    sessionId,
    "folder_id",
    main.STORE_ID,
  );

  return useMemo(
    () => ({ title, createdAt, eventId, folderId }),
    [title, createdAt, eventId, folderId],
  );
}

/**
 * Hook for full session data including content.
 * Automatically triggers lazy loading of content if not already loaded.
 * Use this when you need to display/edit session content.
 */
export function useSessionWithContent(sessionId: string) {
  const { isLoading, isLoaded } = useSessionContentLoader(sessionId);
  const session = useSession(sessionId);

  return useMemo(
    () => ({
      ...session,
      contentLoading: isLoading,
      contentLoaded: isLoaded,
    }),
    [session, isLoading, isLoaded],
  );
}

export function useTemplate(templateId: string) {
  const title = main.UI.useCell(
    "templates",
    templateId,
    "title",
    main.STORE_ID,
  );
  const description = main.UI.useCell(
    "templates",
    templateId,
    "description",
    main.STORE_ID,
  );
  const sections = main.UI.useCell(
    "templates",
    templateId,
    "sections",
    main.STORE_ID,
  );
  return useMemo(
    () => ({ title, description, sections }),
    [title, description, sections],
  );
}

interface TinyBaseTestWrapperProps {
  children: ReactNode;
  initialData?: {
    sessions?: Record<string, Partial<SessionStorage>>;
    humans?: Record<string, Partial<HumanStorage>>;
    organizations?: Record<string, Partial<OrganizationStorage>>;
    templates?: Record<string, Partial<TemplateStorage>>;
    enhanced_notes?: Record<string, Partial<EnhancedNoteStorage>>;
  };
  initialValues?: {
    user_id?: string;
  };
}

export function TinyBaseTestWrapper({
  children,
  initialData,
  initialValues,
}: TinyBaseTestWrapperProps) {
  const {
    useCreateMergeableStore,
    useProvideStore,
    useProvideIndexes,
    useProvideRelationships,
    useProvideQueries,
    useCreateIndexes,
    useCreateRelationships,
    useCreateQueries,
    createMergeableStore,
    createIndexes,
    createQueries,
    createRelationships,
    SCHEMA,
  } = main.testUtils;

  const store = useCreateMergeableStore(() => {
    const s = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);

    if (initialValues?.user_id) {
      s.setValue("user_id", initialValues.user_id);
    }

    if (initialData?.sessions) {
      Object.entries(initialData.sessions).forEach(([id, data]) => {
        s.setRow("sessions", id, data as Record<string, unknown>);
      });
    }
    if (initialData?.humans) {
      Object.entries(initialData.humans).forEach(([id, data]) => {
        s.setRow("humans", id, data as Record<string, unknown>);
      });
    }
    if (initialData?.organizations) {
      Object.entries(initialData.organizations).forEach(([id, data]) => {
        s.setRow("organizations", id, data as Record<string, unknown>);
      });
    }
    if (initialData?.templates) {
      Object.entries(initialData.templates).forEach(([id, data]) => {
        s.setRow("templates", id, data as Record<string, unknown>);
      });
    }
    if (initialData?.enhanced_notes) {
      Object.entries(initialData.enhanced_notes).forEach(([id, data]) => {
        s.setRow("enhanced_notes", id, data as Record<string, unknown>);
      });
    }

    return s;
  });

  const indexes = useCreateIndexes(store, (store) =>
    createIndexes(store)
      .setIndexDefinition(
        main.INDEXES.sessionParticipantsBySession,
        "mapping_session_participant",
        "session_id",
      )
      .setIndexDefinition(
        main.INDEXES.sessionsByFolder,
        "sessions",
        "folder_id",
        "created_at",
      )
      .setIndexDefinition(
        main.INDEXES.transcriptBySession,
        "transcripts",
        "session_id",
        "created_at",
      )
      .setIndexDefinition(
        main.INDEXES.enhancedNotesBySession,
        "enhanced_notes",
        "session_id",
        "position",
      ),
  );

  const relationships = useCreateRelationships(store, (store) =>
    createRelationships(store)
      .setRelationshipDefinition(
        main.RELATIONSHIPS.sessionToEvent,
        "sessions",
        "events",
        "event_id",
      )
      .setRelationshipDefinition(
        main.RELATIONSHIPS.enhancedNoteToSession,
        "enhanced_notes",
        "sessions",
        "session_id",
      ),
  );

  const queries = useCreateQueries(store, (store) =>
    createQueries(store)
      .setQueryDefinition(
        main.QUERIES.visibleHumans,
        "humans",
        ({ select }) => {
          select("name");
          select("email");
          select("org_id");
          select("job_title");
          select("linkedin_username");
        },
      )
      .setQueryDefinition(
        main.QUERIES.visibleOrganizations,
        "organizations",
        ({ select }) => {
          select("name");
        },
      )
      .setQueryDefinition(
        main.QUERIES.visibleTemplates,
        "templates",
        ({ select }) => {
          select("title");
          select("description");
          select("sections");
        },
      ),
  );

  useProvideStore(main.STORE_ID, store);
  useProvideIndexes(main.STORE_ID, indexes!);
  useProvideRelationships(main.STORE_ID, relationships!);
  useProvideQueries(main.STORE_ID, queries!);

  return <>{children}</>;
}
