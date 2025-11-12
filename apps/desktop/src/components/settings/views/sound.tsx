import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { MicIcon, Volume2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { commands as listenerCommands } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import { Label } from "@hypr/ui/components/ui/label";
import { Slider } from "@hypr/ui/components/ui/slider";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/ui/lib/utils";
import { message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

interface PermissionItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  done: boolean | undefined;
  isPending: boolean;
  onRequest: () => void;
  buttonText: string;
}

function PermissionItem({
  icon,
  title,
  description,
  done,
  isPending,
  onRequest,
  buttonText,
}: PermissionItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4",
        !done && "bg-muted",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-6 items-center justify-center">{icon}</div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">
            {done ? <Trans>Access Granted</Trans> : description}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!done && (
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
              : <Trans>{buttonText}</Trans>}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Sound() {
  const { t } = useLingui();

  const [micPermissionRequested, setMicPermissionRequested] = useState(false);
  const [micGain, setMicGain] = useState(1.5);
  const [micLevel, setMicLevel] = useState(0);
  const [calibrationProgress, setCalibrationProgress] = useState<
    {
      current_gain: number;
      current_step: number;
      total_steps: number;
      message: string;
    } | null
  >(null);

  const CALIBRATION_PHRASE = "the quick brown fox jumps over the lazy dog";

  const audioGainsQuery = useQuery({
    queryKey: ["audioGains"],
    queryFn: () => listenerCommands.getAudioGains(),
  });

  const micTestStatusQuery = useQuery({
    queryKey: ["micTestStatus"],
    queryFn: () => listenerCommands.getMicTestStatus(),
    refetchInterval: 500,
  });

  useEffect(() => {
    if (audioGainsQuery.data?.post_mic_gain) {
      setMicGain(audioGainsQuery.data.post_mic_gain);
    }
  }, [audioGainsQuery.data]);

  // Listen for mic level events
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen<number>("mic-test-level", (event) => {
        setMicLevel(event.payload);
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  // Reset level when test stops
  useEffect(() => {
    if (!micTestStatusQuery.data) {
      setMicLevel(0);
    }
  }, [micTestStatusQuery.data]);

  const audioGainsMutation = useMutation({
    mutationFn: (
      gains: { pre_mic_gain: number; post_mic_gain: number; pre_speaker_gain: number; post_speaker_gain: number },
    ) => listenerCommands.setAudioGains(gains),
    onError: (error) => {
      console.error("Failed to save audio gains:", error);
    },
  });

  const micPermissionStatus = useQuery({
    queryKey: ["micPermission"],
    queryFn: () => listenerCommands.checkMicrophoneAccess(),
    refetchInterval: 1000,
  });

  const systemAudioPermissionStatus = useQuery({
    queryKey: ["systemAudioPermission"],
    queryFn: () => listenerCommands.checkSystemAudioAccess(),
    refetchInterval: 1000,
  });

  const micPermission = useMutation({
    mutationFn: () => listenerCommands.requestMicrophoneAccess(),
    onSuccess: () => {
      setMicPermissionRequested(true);
      setTimeout(() => {
        micPermissionStatus.refetch();
      }, 3000);
    },
    onError: (error) => {
      setMicPermissionRequested(true);
      console.error(error);
    },
  });

  const capturePermission = useMutation({
    mutationFn: () => listenerCommands.requestSystemAudioAccess(),
    onSuccess: () => {
      message("The app will now restart to apply the changes", { kind: "info", title: "System Audio Status Changed" });
      setTimeout(() => {
        relaunch();
      }, 2000);
    },
    onError: console.error,
  });

  const startMicTestMutation = useMutation({
    mutationFn: () => listenerCommands.startMicTest(),
    onError: (error) => {
      message(String(error), { kind: "error", title: "Mic Test Error" });
    },
  });

  const stopMicTestMutation = useMutation({
    mutationFn: () => listenerCommands.stopMicTest(),
    onError: (error) => {
      message(String(error), { kind: "error", title: "Mic Test Error" });
    },
  });

  const calibrateMutation = useMutation({
    mutationFn: () => listenerCommands.calibrateMicrophone(),
    onSuccess: (result) => {
      setCalibrationProgress(null);
      setMicGain(result.gain);

      // Update the gain in the database
      if (audioGainsQuery.data) {
        audioGainsMutation.mutate({
          ...audioGainsQuery.data,
          post_mic_gain: result.gain,
        });
      }

      message(
        `Calibration complete! Best gain: ${result.gain.toFixed(1)}x (Score: ${(result.score * 100).toFixed(0)}%)`,
        { kind: "info", title: "Calibration Complete" },
      );
    },
    onError: (error) => {
      setCalibrationProgress(null);
      message(String(error), { kind: "error", title: "Calibration Error" });
    },
  });

  // Listen for calibration progress events
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen("plugin:listener:calibration-progress-event", (event: any) => {
        setCalibrationProgress(event.payload);
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const handleCalibrate = () => {
    setCalibrationProgress({
      current_gain: 0,
      current_step: 0,
      total_steps: 5,
      message: "Starting calibration...",
    });
    calibrateMutation.mutate();
  };

  const handleMicPermissionAction = () => {
    if (micPermissionRequested && !micPermissionStatus.data) {
      listenerCommands.openMicrophoneAccessSettings();
    } else {
      micPermission.mutate();
    }
  };

  return (
    <div>
      <div className="space-y-2">
        <PermissionItem
          icon={<MicIcon className="h-4 w-4" />}
          title={t`Microphone Access`}
          description={t`Required to transcribe your voice during meetings`}
          done={micPermissionStatus.data}
          isPending={micPermission.isPending}
          onRequest={handleMicPermissionAction}
          buttonText={micPermissionRequested && !micPermissionStatus.data ? "Open Settings" : "Enable"}
        />

        <PermissionItem
          icon={<Volume2Icon className="h-4 w-4" />}
          title={t`System Audio Access`}
          description={t`Required to transcribe other people's voice during meetings`}
          done={systemAudioPermissionStatus.data}
          isPending={capturePermission.isPending}
          onRequest={() => capturePermission.mutate({})}
          buttonText="Enable"
        />
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-lg border p-4">
          <Label htmlFor="mic-gain" className="text-sm font-medium">
            <Trans>Microphone Sensitivity</Trans>
          </Label>
          <div className="mt-2 text-xs text-muted-foreground">
            <Trans>Adjust the microphone input gain (default: 1.5x)</Trans>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <Slider
              id="mic-gain"
              min={0.5}
              max={3.0}
              step={0.1}
              value={[micGain]}
              onValueChange={(value) => {
                const newValue = value[0];
                console.log("Slider changed to:", newValue);
                console.log("Mic test status:", micTestStatusQuery.data);
                setMicGain(newValue);
                if (audioGainsQuery.data) {
                  audioGainsMutation.mutate({
                    ...audioGainsQuery.data,
                    post_mic_gain: newValue,
                  });
                }
                // Update mic test gain in real-time if test is running
                if (micTestStatusQuery.data) {
                  console.log("Calling updateMicTestGain with:", newValue);
                  listenerCommands.updateMicTestGain(newValue).then(() => {
                    console.log("updateMicTestGain succeeded");
                  }).catch((err) => {
                    console.error("Failed to update mic test gain:", err);
                  });
                }
              }}
              className="flex-1"
            />
            <span className="min-w-[3rem] text-right text-sm">{micGain.toFixed(1)}x</span>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <Label className="text-sm font-medium">
            <Trans>Microphone Test</Trans>
          </Label>
          <div className="mt-2 text-xs text-muted-foreground">
            <Trans>Test your microphone by speaking and listening to the output</Trans>
          </div>

          {micTestStatusQuery.data && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                <Trans>Audio Level</Trans>
              </div>
              <div className="relative h-8 w-full overflow-hidden rounded-md bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
                  style={{ width: `${micLevel * 100}%` }}
                />
                {/* Visual markers */}
                <div className="absolute inset-0 flex items-center">
                  <div className="flex h-full w-full">
                    {[0.2, 0.4, 0.6, 0.8].map((marker) => (
                      <div
                        key={marker}
                        className="h-full border-r border-background/20"
                        style={{ width: "20%" }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (micTestStatusQuery.data) {
                  stopMicTestMutation.mutate();
                } else {
                  startMicTestMutation.mutate();
                }
              }}
              disabled={startMicTestMutation.isPending || stopMicTestMutation.isPending}
              className="min-w-32"
            >
              {startMicTestMutation.isPending || stopMicTestMutation.isPending
                ? (
                  <>
                    <Spinner className="mr-2" />
                    <Trans>Loading...</Trans>
                  </>
                )
                : micTestStatusQuery.data
                ? <Trans>Stop Test</Trans>
                : <Trans>Test Microphone</Trans>}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <Label className="text-sm font-medium">
            <Trans>Automatic Calibration</Trans>
          </Label>
          <div className="mt-2 text-xs text-muted-foreground">
            <Trans>Automatically find the best microphone gain by reading a test phrase</Trans>
          </div>

          {calibrationProgress && (
            <div className="mt-4 space-y-3">
              <div className="text-sm">
                <div className="font-medium mb-2">{calibrationProgress.message}</div>
                <div className="text-xs text-muted-foreground">
                  <Trans>Step {calibrationProgress.current_step} of {calibrationProgress.total_steps}</Trans>
                </div>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(calibrationProgress.current_step / calibrationProgress.total_steps) * 100}%` }}
                />
              </div>
              <div className="rounded-md bg-muted p-3 text-sm font-medium">
                <Trans>Please read clearly:</Trans> "{CALIBRATION_PHRASE}"
              </div>
            </div>
          )}

          <div className="mt-4">
            <Button
              variant="outline"
              onClick={handleCalibrate}
              disabled={calibrateMutation.isPending}
              className="min-w-32"
            >
              {calibrateMutation.isPending
                ? (
                  <>
                    <Spinner className="mr-2" />
                    <Trans>Calibrating...</Trans>
                  </>
                )
                : <Trans>Calibrate Microphone</Trans>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
