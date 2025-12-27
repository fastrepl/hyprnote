import { Icon } from "@iconify-icon/react";
import type { ReactNode } from "react";

import { OutlookIcon } from "@hypr/ui/components/icons/outlook";

type CalendarProvider = {
  disabled: boolean;
  id: string;
  displayName: string;
  icon: ReactNode;
  badge?: string | null;
  platform?: "macos" | "all";
  docsPath: string;
};

export type CalendarProviderId = (typeof _PROVIDERS)[number]["id"];

const _PROVIDERS = [
  {
    disabled: true,
    id: "apple",
    displayName: "Apple",
    badge: "Almost Done, really",
    icon: <Icon icon="logos:apple" width={20} height={20} />,
    platform: "macos",
    docsPath: "/docs/calendar/apple",
  },
  {
    disabled: true,
    id: "google",
    displayName: "Google",
    badge: "After Apple Calendar",
    icon: <Icon icon="logos:google-calendar" width={20} height={20} />,
    platform: "all",
    docsPath: "/docs/calendar/gcal",
  },
  {
    disabled: true,
    id: "outlook",
    displayName: "Outlook",
    badge: "After Apple Calendar",
    icon: <OutlookIcon size={20} />,
    platform: "all",
    docsPath: "/docs/calendar/outlook",
  },
] as const satisfies readonly CalendarProvider[];

export const PROVIDERS = [..._PROVIDERS];
