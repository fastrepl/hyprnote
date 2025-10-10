import { Bell } from "lucide-react";
import { useCallback } from "react";

import { MenuItem } from "./shared";

export function NotificationsItem() {
  const handleClickNotifications = useCallback(() => {
    console.log("Notifications");
  }, []);

  return (
    <MenuItem
      icon={Bell}
      label="Notifications"
      badge={10}
      onClick={handleClickNotifications}
    />
  );
}
