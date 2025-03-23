import {
  BellIcon,
  BlocksIcon,
  CalendarIcon,
  CreditCardIcon,
  FileTextIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";

// Define the navigation items without translations
export const data = {
  nav: [
    { nameKey: "General", icon: SettingsIcon },
    { nameKey: "Calendar", icon: CalendarIcon },
    { nameKey: "Notifications", icon: BellIcon },
    { nameKey: "Templates", icon: FileTextIcon },
    { nameKey: "Extensions", icon: BlocksIcon },
    { nameKey: "Team", icon: UsersIcon },
    { nameKey: "Billing", icon: CreditCardIcon },
  ],
} as const;

export type NavItem = typeof data.nav[number];
