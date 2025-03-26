import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MicIcon, Volume2Icon } from "lucide-react";

import { commands as listenerCommands } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";

interface PermissionItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  done: boolean | undefined;
  isPending: boolean;
  onRequest: () => void;
}

function PermissionItem({
  icon,
  title,
  description,
  done,
  isPending,
  onRequest,
}: PermissionItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-6 items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium">
            {title}
          </div>
          <div className="text-xs text-muted-foreground">
            {description}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {done
          ? "✅"
          : (
            <Button
              variant="outline"
              size="sm"
              onClick={onRequest}
              disabled={isPending}
              className="min-w-20 text-center"
            >
              {isPending
                ? (
                  <>
                    <Spinner className="mr-2" />
                    <Trans>Requesting...</Trans>
                  </>
                )
                : <Trans>Enable</Trans>}
            </Button>
          )}
      </div>
    </div>
  );
}

export default function Permissions() {
  const queryClient = useQueryClient();
  const { t } = useLingui();

  const micPermissionStatus = useQuery({
    queryKey: ["micPermission"],
    queryFn: async () => {
      try {
        return await listenerCommands.requestMicrophoneAccess();
      } catch (e) {
        console.error(e);
        return false;
      }
    },
  });

  const systemAudioPermissionStatus = useQuery({
    queryKey: ["systemAudioPermission"],
    queryFn: async () => {
      try {
        return await listenerCommands.requestSystemAudioAccess();
      } catch (e) {
        console.error(e);
        return false;
      }
    },
  });

  const micPermission = useMutation({
    mutationFn: async (): Promise<boolean> => {
      return listenerCommands.requestMicrophoneAccess();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["micPermission"] });
    },
    onError: console.error,
  });

  const capturePermission = useMutation({
    mutationFn: async (): Promise<boolean> => {
      return listenerCommands.requestSystemAudioAccess();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemAudioPermission"] });
    },
    onError: console.error,
  });

  return (
    <div>
      <div className="space-y-2">
        <PermissionItem
          icon={<MicIcon className="h-4 w-4" />}
          title={t`Microphone Access`}
          description={t`Required to transcribe your voice during meetings`}
          done={micPermissionStatus.data}
          isPending={micPermission.isPending}
          onRequest={() => micPermission.mutate({})}
        />

        <PermissionItem
          icon={<Volume2Icon className="h-4 w-4" />}
          title={t`System Audio Access`}
          description={t`Required to transcribe other people's voice during meetings`}
          done={systemAudioPermissionStatus.data}
          isPending={capturePermission.isPending}
          onRequest={() => capturePermission.mutate({})}
        />
      </div>
    </div>
  );
}
