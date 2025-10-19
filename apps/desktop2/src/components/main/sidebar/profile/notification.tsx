import { Button } from "@hypr/ui/components/ui/button";

import { clsx } from "clsx";
import { ArrowLeft, ArrowRight, Bell, CheckCheck, MessageSquare } from "lucide-react";

import { cn } from "@hypr/ui/lib/utils";

import { MenuItem } from "./shared";

export function NotificationsMenuHeader({ onClick }: { onClick: () => void }) {
  return (
    <MenuItem
      icon={Bell}
      label="Notifications"
      onClick={onClick}
      suffixIcon={ArrowRight}
    />
  );
}

interface Notification {
  id: string;
  type: "info" | "success" | "message";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "3",
    type: "info",
    title: "Calendar reminder",
    description: "Team standup in 30 minutes",
    timestamp: "3 hours ago",
    read: true,
  },
];

export function NotificationsMenuContent({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-full flex flex-col px-2">
      <div className="flex w-full items-center gap-1 text-sm font-medium">
        <Button
          size="icon"
          variant="ghost"
          onClick={onBack}
          className="shrink-0"
        >
          <ArrowLeft size={16} />
        </Button>
        Notifications
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {MOCK_NOTIFICATIONS.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
          />
        ))}

        {MOCK_NOTIFICATIONS.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bell className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No notifications</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  const getIcon = () => {
    switch (notification.type) {
      case "message":
        return MessageSquare;
      case "success":
        return CheckCheck;
      default:
        return Bell;
    }
  };

  const Icon = getIcon();

  return (
    <button
      className={cn([
        "flex w-full gap-3 rounded-lg",
        "px-4 py-2.5",
        "text-left",
        "transition-colors hover:bg-neutral-100",
        !notification.read && "bg-blue-50/50",
      ])}
    >
      <div
        className={cn([
          "flex-shrink-0 w-8 h-8 rounded-full",
          "flex items-center justify-center",
          notification.type === "message" && "bg-purple-100",
          notification.type === "success" && "bg-green-100",
          notification.type === "info" && "bg-blue-100",
        ])}
      >
        <Icon
          className={cn([
            "h-4 w-4",
            notification.type === "message" && "text-purple-600",
            notification.type === "success" && "text-green-600",
            notification.type === "info" && "text-blue-600",
          ])}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p
            className={clsx(
              "text-sm font-medium text-black truncate",
              !notification.read && "font-semibold",
            )}
          >
            {notification.title}
          </p>
          {!notification.read && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />}
        </div>
        <p className="text-xs text-neutral-600 line-clamp-2 mb-1">
          {notification.description}
        </p>
        <p className="text-xs text-neutral-400">{notification.timestamp}</p>
      </div>
    </button>
  );
}
