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
};

export type CalendarProviderId = (typeof _PROVIDERS)[number]["id"];

const _PROVIDERS = [
  {
    disabled: false,
    id: "apple",
    displayName: "Apple Calendar",
    badge: null,
    icon: <Icon icon="logos:apple" width={20} height={20} />,
    platform: "macos",
  },
  {
    disabled: true,
    id: "google",
    displayName: "Google Calendar",
    badge: "Coming Soon",
    icon: <Icon icon="logos:google-calendar" width={20} height={20} />,
    platform: "all",
  },
  {
    disabled: true,
    id: "outlook",
    displayName: "Outlook",
    badge: "Coming Soon",
    icon: <OutlookIcon size={20} />,
    platform: "all",
  },
] as const satisfies readonly CalendarProvider[];

export const PROVIDERS = [..._PROVIDERS];
