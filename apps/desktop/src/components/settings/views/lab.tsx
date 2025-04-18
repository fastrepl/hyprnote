import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BellIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { commands as flagsCommands } from "@hypr/plugin-flags";
import { commands as notificationCommands } from "@hypr/plugin-notification";
import { Switch } from "@hypr/ui/components/ui/switch";

export default function Lab() {
  return (
    <div>
      <div className="space-y-4">
        <Notification />
        <ChatPanel />
      </div>
    </div>
  );
}

function Notification() {
  const detect = useQuery({
    queryKey: ["notification", "detect"],
    queryFn: () => notificationCommands.getDetectNotification(),
  });

  const permission = useQuery({
    queryKey: ["notification", "permission"],
    queryFn: () => notificationCommands.checkNotificationPermission(),
  });

  const detectMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) {
        notificationCommands.setDetectNotification(true);
        notificationCommands.startDetectNotification();
      } else {
        notificationCommands.setDetectNotification(false);
        notificationCommands.stopDetectNotification();
      }

      return enabled;
    },
    onSuccess: (data) => {
      detect.refetch();
    },
  });

  return (
    <FeatureFlag
      title="Notification"
      description={permission.data?.toString() ?? ""}
      icon={<BellIcon />}
      enabled={detect.data ?? false}
      onToggle={detectMutation.mutate}
    />
  );
}

function ChatPanel() {
  const noteChatQuery = useQuery({
    queryKey: ["flags", "ChatRightPanel"],
    queryFn: () => flagsCommands.isEnabled("ChatRightPanel"),
  });

  const noteChatMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) {
        flagsCommands.enable("ChatRightPanel");
      } else {
        flagsCommands.disable("ChatRightPanel");
      }
    },
    onSuccess: () => {
      noteChatQuery.refetch();
    },
  });

  const handleToggleNoteChat = (enabled: boolean) => {
    noteChatMutation.mutate(enabled);
  };

  return (
    <FeatureFlag
      title="Hyprnote Assistant"
      description="Ask our AI assistant about past notes and upcoming events"
      icon={<ChatLogo />}
      enabled={noteChatQuery.data ?? false}
      onToggle={handleToggleNoteChat}
    />
  );
}

function ChatLogo() {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const animationInterval = setInterval(() => {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setIsAnimating(false);
      }, 1625);
      return () => clearTimeout(timeout);
    }, 4625);

    return () => clearInterval(animationInterval);
  }, []);

  return (
    <div className="relative w-6 aspect-square flex items-center justify-center">
      <img
        src={isAnimating ? "/assets/dynamic.gif" : "/assets/static.png"}
        alt="AI Assistant"
        className="w-full h-full"
      />
    </div>
  );
}

function FeatureFlag({
  title,
  description,
  icon,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex flex-col rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center">
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium">
              <Trans>{title}</Trans>
            </div>
            <div className="text-xs text-muted-foreground">
              <Trans>{description}</Trans>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}
