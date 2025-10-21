import { AlertTriangle, Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

export function Permissions() {
  const [hasMicrophoneAccess, setHasMicrophoneAccess] = useState(true);
  const [hasSystemAudioAccess, setHasSystemAudioAccess] = useState(false);

  const handleGrantMicrophoneAccess = () => {
    setHasMicrophoneAccess(!hasMicrophoneAccess);
  };

  const handleGrantSystemAudioAccess = () => {
    setHasSystemAudioAccess(!hasSystemAudioAccess);
  };

  return (
    <div>
      <h2 className="font-semibold mb-4">Permissions</h2>
      <div className="space-y-4">
        <PermissionRow
          title="Microphone access"
          hasAccess={hasMicrophoneAccess}
          grantedMessage="Thanks for granting permission for microphone"
          deniedMessage="Oops! You need to grant access to use Hyprnote"
          onGrant={handleGrantMicrophoneAccess}
        />
        <PermissionRow
          title="System audio access"
          hasAccess={hasSystemAudioAccess}
          grantedMessage="Thanks for granting permission for system audio"
          deniedMessage="Oops! You need to grant access to use Hyprnote"
          onGrant={handleGrantSystemAudioAccess}
        />
      </div>
    </div>
  );
}
function PermissionRow({
  title,
  hasAccess,
  grantedMessage,
  deniedMessage,
  onGrant,
}: {
  title: string;
  hasAccess: boolean;
  grantedMessage: string;
  deniedMessage: string;
  onGrant: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h3 className={cn("text-sm font-medium mb-1", !hasAccess && "text-red-500")}>
          {title}
        </h3>
        <p className={cn(["text-xs", hasAccess ? "text-neutral-600" : "text-red-500"])}>
          {hasAccess ? grantedMessage : deniedMessage}
        </p>
      </div>
      <Button
        variant={hasAccess ? "outline" : "default"}
        className="w-40 text-xs shadow-none"
        disabled={hasAccess}
        onClick={onGrant}
      >
        {hasAccess ? <Check size={16} /> : <AlertTriangle size={16} />}
        {hasAccess ? "Access Granted" : "Grant Permission"}
      </Button>
    </div>
  );
}
