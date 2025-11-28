import { type ReactNode, useCallback, useMemo } from "react";

import * as main from "../store/tinybase/main";

export function useSession(sessionId: string) {
  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);
  const rawMd = main.UI.useCell("sessions", sessionId, "raw_md", main.STORE_ID);
  const enhancedMd = main.UI.useCell(
    "sessions",
    sessionId,
    "enhanced_md",
    main.STORE_ID,
  );
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
    () => ({ title, rawMd, enhancedMd, createdAt, eventId, folderId }),
    [title, rawMd, enhancedMd, createdAt, eventId, folderId],
  );
}

export function useSessionTitle(sessionId: string) {
  return main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);
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

export function useSessionRawMd(sessionId: string) {
  return main.UI.useCell("sessions", sessionId, "raw_md", main.STORE_ID);
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
  const isUser = main.UI.useCell("humans", humanId, "is_user", main.STORE_ID);

  return useMemo(
    () => ({ name, email, orgId, jobTitle, linkedinUsername, isUser }),
    [name, email, orgId, jobTitle, linkedinUsername, isUser],
  );
}

export function useOrganization(orgId: string) {
  const name = main.UI.useCell("organizations", orgId, "name", main.STORE_ID);
  const createdAt = main.UI.useCell(
    "organizations",
    orgId,
    "created_at",
    main.STORE_ID,
  );

  return useMemo(() => ({ name, createdAt }), [name, createdAt]);
}

export function useSessionParticipants(sessionId: string) {
  return main.UI.useSliceRowIds(
    main.INDEXES.sessionParticipantsBySession,
    sessionId,
    main.STORE_ID,
  );
}

export function useTranscriptsBySession(sessionId: string) {
  return main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );
}

export function useWordsByTranscript(transcriptId: string) {
  return main.UI.useSliceRowIds(
    main.INDEXES.wordsByTranscript,
    transcriptId,
    main.STORE_ID,
  );
}

export function useFolder(folderId: string) {
  const name = main.UI.useCell("folders", folderId, "name", main.STORE_ID);
  const parentFolderId = main.UI.useCell(
    "folders",
    folderId,
    "parent_folder_id",
    main.STORE_ID,
  );
  const createdAt = main.UI.useCell(
    "folders",
    folderId,
    "created_at",
    main.STORE_ID,
  );

  return useMemo(
    () => ({ name, parentFolderId, createdAt }),
    [name, parentFolderId, createdAt],
  );
}

export function useSessionsByFolder(folderId: string) {
  return main.UI.useSliceRowIds(
    main.INDEXES.sessionsByFolder,
    folderId,
    main.STORE_ID,
  );
}

export function useFoldersByParent(parentFolderId: string) {
  return main.UI.useSliceRowIds(
    main.INDEXES.foldersByParent,
    parentFolderId,
    main.STORE_ID,
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
  const createdAt = main.UI.useCell(
    "templates",
    templateId,
    "created_at",
    main.STORE_ID,
  );

  return useMemo(
    () => ({ title, description, sections, createdAt }),
    [title, description, sections, createdAt],
  );
}

export function useVisibleTemplates() {
  return main.UI.useResultRowIds(main.QUERIES.visibleTemplates, main.STORE_ID);
}

export function useVisibleHumans() {
  return main.UI.useResultRowIds(main.QUERIES.visibleHumans, main.STORE_ID);
}

export function useVisibleOrganizations() {
  return main.UI.useResultRowIds(
    main.QUERIES.visibleOrganizations,
    main.STORE_ID,
  );
}

export function useVisibleFolders() {
  return main.UI.useResultRowIds(main.QUERIES.visibleFolders, main.STORE_ID);
}

export function useVisibleVocabs() {
  return main.UI.useResultTable(main.QUERIES.visibleVocabs, main.STORE_ID);
}

export function useUserId() {
  return main.UI.useValue("user_id", main.STORE_ID);
}

interface TinyBaseTestWrapperProps {
  children: ReactNode;
  initialData?: {
    sessions?: Record<string, Partial<main.SessionStorage>>;
    humans?: Record<string, Partial<main.HumanStorage>>;
    organizations?: Record<string, Partial<main.OrganizationStorage>>;
    folders?: Record<string, Partial<main.FolderStorage>>;
    templates?: Record<string, Partial<main.TemplateStorage>>;
    memories?: Record<string, Partial<main.MemoryStorage>>;
    enhanced_notes?: Record<string, Partial<main.EnhancedNoteStorage>>;
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
    if (initialData?.folders) {
      Object.entries(initialData.folders).forEach(([id, data]) => {
        s.setRow("folders", id, data as Record<string, unknown>);
      });
    }
    if (initialData?.templates) {
      Object.entries(initialData.templates).forEach(([id, data]) => {
        s.setRow("templates", id, data as Record<string, unknown>);
      });
    }
    if (initialData?.memories) {
      Object.entries(initialData.memories).forEach(([id, data]) => {
        s.setRow("memories", id, data as Record<string, unknown>);
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
        main.INDEXES.foldersByParent,
        "folders",
        "parent_folder_id",
        "name",
      )
      .setIndexDefinition(
        main.INDEXES.transcriptBySession,
        "transcripts",
        "session_id",
        "created_at",
      )
      .setIndexDefinition(
        main.INDEXES.wordsByTranscript,
        "words",
        "transcript_id",
        "start_ms",
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
        main.RELATIONSHIPS.sessionToFolder,
        "sessions",
        "folders",
        "folder_id",
      )
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
          select("is_user");
          select("created_at");
        },
      )
      .setQueryDefinition(
        main.QUERIES.visibleOrganizations,
        "organizations",
        ({ select }) => {
          select("name");
          select("created_at");
        },
      )
      .setQueryDefinition(
        main.QUERIES.visibleTemplates,
        "templates",
        ({ select }) => {
          select("title");
          select("description");
          select("sections");
          select("created_at");
        },
      )
      .setQueryDefinition(
        main.QUERIES.visibleFolders,
        "folders",
        ({ select }) => {
          select("name");
          select("parent_folder_id");
          select("created_at");
        },
      )
      .setQueryDefinition(
        main.QUERIES.visibleVocabs,
        "memories",
        ({ select, where }) => {
          select("text");
          select("created_at");
          where((getCell) => getCell("type") === "vocab");
        },
      ),
  );

  useProvideStore(main.STORE_ID, store);
  useProvideIndexes(main.STORE_ID, indexes!);
  useProvideRelationships(main.STORE_ID, relationships!);
  useProvideQueries(main.STORE_ID, queries!);

  return <>{children}</>;
}
