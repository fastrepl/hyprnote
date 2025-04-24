import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CloudDrizzleIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { commands as flagsCommands } from "@hypr/plugin-flags";
import { Switch } from "@hypr/ui/components/ui/switch";

export default function Lab() {
  return (
    <div>
      <div className="space-y-4">
        <ChatPanel />
        <CloudPreview />
      </div>
    </div>
  );
}

function CloudPreview() {
  const flagQuery = useQuery({
    queryKey: ["flags", "CloudPreview"],
    queryFn: () => flagsCommands.isEnabled("CloudPreview"),
  });

  const flagMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) {
        flagsCommands.enable("CloudPreview");
      } else {
        flagsCommands.disable("CloudPreview");
      }
    },
    onSuccess: () => {
      flagQuery.refetch();
    },
  });

  const handleToggle = (enabled: boolean) => {
    flagMutation.mutate(enabled);
  };

  return (
    <FeatureFlag
      title="Hyprnote Cloud"
      description="Access to the latest AI model for Hyprnote Pro"
      icon={<CloudDrizzleIcon />}
      enabled={flagQuery.data ?? false}
      onToggle={handleToggle}
    />
  );
}

function ChatPanel() {
  const flagQuery = useQuery({
    queryKey: ["flags", "ChatRightPanel"],
    queryFn: () => flagsCommands.isEnabled("ChatRightPanel"),
  });

  const flagMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) {
        flagsCommands.enable("ChatRightPanel");
      } else {
        flagsCommands.disable("ChatRightPanel");
      }
    },
    onSuccess: () => {
      flagQuery.refetch();
    },
  });

  const handleToggle = (enabled: boolean) => {
    flagMutation.mutate(enabled);
  };

  return (
    <FeatureFlag
      title="Hyprnote Assistant"
      description="Ask our AI assistant about past notes and upcoming events"
      icon={<ChatLogo />}
      enabled={flagQuery.data ?? false}
      onToggle={handleToggle}
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
