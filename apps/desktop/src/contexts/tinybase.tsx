import { useEffect } from "react";

import { createMergeableStore, createRelationships } from "tinybase";
import { createCustomPersister } from "tinybase/persisters";
import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel";
import { Provider, useCreateMergeableStore, useCreateRelationships } from "tinybase/ui-react";

import {
  type Calendar,
  commands as dbCommands,
  type Event,
  type Human,
  type Organization,
  type Session,
} from "@hypr/plugin-db";
import { useHypr } from "./hypr";

export function TinyBaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = useHypr();
  const store = useCreateMergeableStore(createMergeableStore);

  const persister = createCustomPersister(
    store,
    async () => {
      const [sessions, humans, organizations, calendars, events] = await Promise.all([
        dbCommands.listSessions(null),
        dbCommands.listHumans(null),
        dbCommands.listOrganizations(null),
        dbCommands.listCalendars(userId),
        dbCommands.listEvents(null),
      ]);

      return [{
        sessions: sessions.reduce((acc, session) => {
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
        humans: humans.reduce((acc, human) => {
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

        organizations: organizations.reduce((acc, organization) => {
          acc[organization.id] = {
            id: organization.id,
            name: organization.name ?? "",
            description: organization.description ?? "",
          } satisfies Organization;
          return acc;
        }, {} as Record<string, Record<string, any>>),

        calendars: calendars.reduce((acc, calendar) => {
          acc[calendar.id] = calendar satisfies Calendar;
          return acc;
        }, {} as Record<string, Record<string, any>>),
        events: events.reduce((acc, event) => {
          acc[event.id] = event satisfies Event;
          return acc;
        }, {} as Record<string, Record<string, any>>),
      }, {}];
    },
    async (getContent) => {
      const [t] = getContent();

      const tables = t as unknown as {
        sessions: Session[];
        humans: Human[];
        organizations: Organization[];
        calendars: Calendar[];
        events: Event[];
        session_participants: { session_id: string; human_id: string }[];
      };

      await Promise.all([
        ...Object.values(tables.sessions).map(dbCommands.upsertSession),
        ...Object.values(tables.humans).map(dbCommands.upsertHuman),
        ...Object.values(tables.organizations).map(dbCommands.upsertOrganization),
        ...Object.values(tables.calendars).map(dbCommands.upsertCalendar),
        ...Object.values(tables.session_participants).map(p =>
          dbCommands.sessionAddParticipant(p.session_id, p.human_id)
        ),
      ]);
    },
    (listener) => setInterval(listener, 1000),
    (interval) => clearInterval(interval),
    undefined,
    3,
  );

  // useEffect(() => {
  //   persister.startAutoPersisting();
  //   return () => {
  //     persister.startAutoPersisting().then(() => persister.destroy());
  //   };
  // }, []);

  const relationships = useCreateRelationships(store, (store) => {
    const relationships = createRelationships(store);

    relationships.setRelationshipDefinition(
      "humanOrganization",
      "humans",
      "organizations",
      "organization_id",
    );

    relationships.setRelationshipDefinition(
      "humanSessions",
      "sessions",
      "humans",
      "user_id",
    );

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

    relationships.setRelationshipDefinition(
      "userCalendars",
      "calendars",
      "humans",
      "user_id",
    );

    relationships.setRelationshipDefinition(
      "userEvents",
      "events",
      "humans",
      "user_id",
    );

    relationships.setRelationshipDefinition(
      "calendarEvents",
      "events",
      "calendars",
      "calendar_id",
    );

    relationships.setRelationshipDefinition(
      "sessionEvent",
      "sessions",
      "events",
      "calendar_event_id",
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
    <Provider store={store} relationships={relationships} persister={persister}>
      {children}
    </Provider>
  );
}
