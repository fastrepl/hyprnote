import { useQueries } from "@tanstack/react-query";
import { useEffect } from "react";

import { createMergeableStore, createRelationships } from "tinybase";
import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel";
import { Provider, useCreateMergeableStore, useCreateRelationships } from "tinybase/ui-react";

import { commands as dbCommands, type Human, type Organization } from "@hypr/plugin-db";

export function TinyBaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [humans, organizations] = useQueries({
    queries: [
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

  const store = useCreateMergeableStore(() => {
    const store = createMergeableStore();

    store.setTables({
      "humans": (humans.data ?? []).reduce((acc, human) => {
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
      }, {} as Record<string, Record<string, string | boolean>>),

      "organizations": (organizations.data ?? []).reduce((acc, organization) => {
        acc[organization.id] = {
          id: organization.id,
          name: organization.name ?? "",
          description: organization.description ?? "",
        } satisfies Organization;
        return acc;
      }, {} as Record<string, Record<string, any>>),
    });

    return store;
  }, [humans.data, organizations.data]);

  const relationships = useCreateRelationships(store, (store) => {
    const relationships = createRelationships(store);

    relationships.setRelationshipDefinition(
      "organizationMembers",
      "organizations",
      "humans",
      "organization_id",
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
