import {
  SettingsIcon,
  UserIcon,
  CalendarIcon,
  FileTextIcon,
  CreditCardIcon,
} from "lucide-react";

export const data = {
  nav: [
    { name: "General", icon: SettingsIcon },
    { name: "Calendar", icon: CalendarIcon },
    { name: "Templates", icon: FileTextIcon },
    { name: "Team & Billing", icon: CreditCardIcon },
    { name: "Profile", icon: UserIcon },
  ],
} as const;
