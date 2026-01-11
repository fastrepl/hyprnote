import { useCalendarPersister } from "../persister/calendar";
import { useChatPersister } from "../persister/chat";
import { useChatShortcutPersister } from "../persister/chat-shortcuts";
import { useEventsPersister } from "../persister/events";
import { useHumanPersister } from "../persister/human";
import { useLocalPersister } from "../persister/local";
import { useOrganizationPersister } from "../persister/organization";
import { usePromptPersister } from "../persister/prompts";
import { useSessionPersister } from "../persister/session";
import { useTemplatePersister } from "../persister/templates";
import { useValuesPersister } from "../persister/values";
import { useInitializeStore } from "./initialize";
import { type Store } from "./main";

export function useMainPersisters(store: Store) {
  const localPersister = useLocalPersister(store);

  const valuesPersister = useValuesPersister(store);

  const sessionPersister = useSessionPersister(store);

  const organizationPersister = useOrganizationPersister(store);

  const humanPersister = useHumanPersister(store);

  const eventPersister = useEventsPersister(store);

  const chatPersister = useChatPersister(store);

  const chatShortcutPersister = useChatShortcutPersister(store);

  const promptPersister = usePromptPersister(store);

  const templatePersister = useTemplatePersister(store);

  const calendarPersister = useCalendarPersister(store);

  useInitializeStore(store);

  return {
    localPersister,
    valuesPersister,
    sessionPersister,
    organizationPersister,
    humanPersister,
    eventPersister,
    chatPersister,
    chatShortcutPersister,
    promptPersister,
    templatePersister,
    calendarPersister,
  };
}
