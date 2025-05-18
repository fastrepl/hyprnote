import { useQueries } from "@tanstack/react-query";
import { useEffect } from "react";

import { createMergeableStore, createRelationships } from "tinybase";
import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel";
import { Provider, useCreateMergeableStore, useCreateRelationships } from "tinybase/ui-react";

import { commands as dbCommands, type Human, type Organization, Session } from "@hypr/plugin-db";

export function TinyBaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sessions, humans, organizations] = useQueries({
    queries: [
      {
        queryKey: ["sessions", "list"],
        queryFn: () => dbCommands.listSessions(null),
      },
      {
        queryKey: ["humans", "list"],
        queryFn: () => dbCommands.listHumans(null),
      },
      {
        queryKey: ["organizations", "list"],
        queryFn: () => dbCommands.listOrganizations(null),
      },
    ],
  });

  const sessionParticipantsQueries = useQueries({
    queries: (sessions.data ?? []).map((session) => ({
      queryKey: ["session", session.id, "participants"],
      queryFn: () => dbCommands.sessionListParticipants(session.id),
    })),
  });

  const sessionParticipantsRows = (sessions.data ?? []).flatMap((session, idx) => {
    const humansOfSession = sessionParticipantsQueries[idx]?.data ?? [];
    return humansOfSession.map((human) => ({
      session_id: session.id,
      human_id: human.id,
    }));
  });

  const store = useCreateMergeableStore(() => {
    const store = createMergeableStore();

    store.setTables({
      sessions: (sessions.data ?? []).reduce((acc, session) => {
        acc[session.id] = {
          id: session.id,
          title: session.title ?? "",
          created_at: session.created_at ?? "",
          visited_at: session.visited_at ?? "",
          user_id: session.user_id ?? "",
          calendar_event_id: session.calendar_event_id ?? "",
          raw_memo_html: session.raw_memo_html ?? "",
          enhanced_memo_html: session.enhanced_memo_html ?? "",
          words: session.words ?? [],
        } satisfies Session;
        return acc;
      }, {} as Record<string, Record<string, any>>),

      humans: (humans.data ?? []).reduce((acc, human) => {
        acc[human.id] = {
          id: human.id,
          organization_id: human.organization_id ?? "",
          is_user: human.is_user,
          full_name: human.full_name ?? "",
          email: human.email ?? "",
          job_title: human.job_title ?? "",
          linkedin_username: human.linkedin_username ?? "",
        } satisfies Human;
        return acc;
      }, {} as Record<string, Record<string, any>>),

      organizations: (organizations.data ?? []).reduce((acc, organization) => {
        acc[organization.id] = {
          id: organization.id,
          name: organization.name ?? "",
          description: organization.description ?? "",
        } satisfies Organization;
        return acc;
      }, {} as Record<string, Record<string, any>>),

      // Join table: session_participants (Session x Human)
      session_participants: sessionParticipantsRows.reduce((acc, row) => {
        // Use a composite key for rowId
        const rowId = `${row.session_id}__${row.human_id}`;
        acc[rowId] = row;
        return acc;
      }, {} as Record<string, { session_id: string; human_id: string }>),
    });

    return store;
  }, [sessions.data, humans.data, organizations.data, JSON.stringify(sessionParticipantsRows)]);

  const relationships = useCreateRelationships(store, (store) => {
    const relationships = createRelationships(store);

    // Relationship: a Human belongs to an Organization via `organization_id`.
    // For a given Human row you can get its Organization with
    //   relationships.getRemoteRowId("humanOrganization", humanId)
    // and the members of an Organization with
    //   relationships.getLocalRowIds("humanOrganization", organizationId)
    relationships.setRelationshipDefinition(
      "humanOrganization",
      "humans",
      "organizations",
      "organization_id",
    );

    // Relationship: a Session is owned by a Human (the `user_id` column).
    // Traverse from Session -> Human or Human -> Sessions.
    relationships.setRelationshipDefinition(
      "humanSessions",
      "sessions",
      "humans",
      "user_id",
    );

    // Join relationships for session_participants table
    relationships.setRelationshipDefinition(
      "participantHuman",
      "session_participants",
      "humans",
      "human_id",
    );

    relationships.setRelationshipDefinition(
      "participantSession",
      "session_participants",
      "sessions",
      "session_id",
    );

    return relationships;
  });

  useEffect(() => {
    const sync = createBroadcastChannelSynchronizer(
      store,
      "hyprnote-tinybase-sync",
    );

    sync.startSync();

    return () => {
      sync.stopSync().then(() => sync?.destroy());
    };
  }, [store]);

  return (
    <Provider store={store} relationships={relationships}>
      {children}
    </Provider>
  );
}
