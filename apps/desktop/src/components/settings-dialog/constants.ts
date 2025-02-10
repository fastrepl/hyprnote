import {
  SettingsIcon,
  CalendarIcon,
  FileTextIcon,
  CreditCardIcon,
  UsersIcon,
  BellIcon,
  TagsIcon,
} from "lucide-react";

export const data = {
  nav: [
    { name: "General", icon: SettingsIcon },
    { name: "Calendar", icon: CalendarIcon },
    { name: "Notifications", icon: BellIcon },
    { name: "Templates", icon: FileTextIcon },
    { name: "Tags", icon: TagsIcon },
    { name: "Team", icon: UsersIcon },
    { name: "Billing", icon: CreditCardIcon },
  ],
} as const;
