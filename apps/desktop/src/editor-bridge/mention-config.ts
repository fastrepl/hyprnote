import { useMemo } from "react";

import type { MentionConfig } from "@anlg/editor/widgets";

import { useTimelineSessionsTable } from "~/calendar/queries";
import { useHumans, useOrganizations } from "~/contacts/queries";
import { useSearchEngine } from "~/search/contexts/engine";
import { useFolderPaths } from "~/session/queries/folders";

function interleave<T>(lists: T[][]): T[] {
  const items: T[] = [];
  for (let index = 0; ; index += 1) {
    let added = false;
    for (const list of lists) {
      if (index < list.length) {
        items.push(list[index]);
        added = true;
      }
    }
    if (!added) {
      return items;
    }
  }
}

export function useMentionConfig(): MentionConfig {
  const sessions = useTimelineSessionsTable();
  const humans = useHumans();
  const organizations = useOrganizations();
  const folderPaths = useFolderPaths();
  const { search } = useSearchEngine();

  return useMemo(
    () => ({
      trigger: "@",
      handleSearch: async (query: string) => {
        if (query.trim()) {
          const needle = query.trim().toLocaleLowerCase();
          const folders = folderPaths
            .filter((path) => path.toLocaleLowerCase().includes(needle))
            .map((path) => ({ id: path, type: "folder", label: path }));
          const searchResults = await search(query);
          const hitsByType = new Map<string, typeof folders>();
          for (const hit of searchResults) {
            const item = {
              id: hit.document.id,
              type: hit.document.type,
              label: hit.document.title,
            };
            const group = hitsByType.get(item.type) ?? [];
            group.push(item);
            hitsByType.set(item.type, group);
          }
          return interleave([folders, ...hitsByType.values()]).slice(0, 5);
        }

        const sessionItems = Object.entries(sessions ?? {}).flatMap(
          ([rowId, row]) => {
            const title = row.title as string | undefined;
            return title ? [{ id: rowId, type: "session", label: title }] : [];
          },
        );
        const humanItems = humans.flatMap((human) =>
          human.name
            ? [{ id: human.id, type: "human", label: human.name }]
            : [],
        );
        const organizationItems = organizations.flatMap((organization) =>
          organization.name
            ? [
                {
                  id: organization.id,
                  type: "organization",
                  label: organization.name,
                },
              ]
            : [],
        );
        const folderItems = folderPaths.map((path) => ({
          id: path,
          type: "folder",
          label: path,
        }));
        return interleave([
          sessionItems,
          humanItems,
          organizationItems,
          folderItems,
        ]).slice(0, 5);
      },
    }),
    [sessions, humans, organizations, folderPaths, search],
  );
}
