import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MicIcon, Volume2Icon } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import clsx from "clsx";

import { type as getOsType } from "@tauri-apps/plugin-os";

import { Particles } from "@hypr/ui/components/ui/particles";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import ShimmerButton from "@hypr/ui/components/ui/shimmer-button";

import { commands as listenerCommands } from "@hypr/plugin-listener";
import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { commands as sfxCommands } from "@hypr/plugin-sfx";

export const Route = createFileRoute("/onboarding")({
  component: Component,
});

function Component() {
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      sfxCommands.stop("BGM");
    };
  }, []);

  const osType = useQuery({
    queryKey: ["osType"],
    queryFn: async () => {
      return getOsType();
    },
  });

  const micPermission = useMutation({
    mutationFn: async (): Promise<boolean> => {
      return listenerCommands.requestMicrophoneAccess();
    },
    onError: console.error,
  });

  const capturePermission = useMutation({
    mutationFn: async (): Promise<boolean> => {
      return listenerCommands.requestSystemAudioAccess();
    },
    onError: console.error,
  });

  const calendarPermission = useMutation({
    mutationFn: async (): Promise<boolean> => {
      await appleCalendarCommands.requestCalendarAccess();
      return appleCalendarCommands.calendarAccessStatus();
    },
    onError: console.error,
  });

  const contactsPermission = useMutation({
    mutationFn: async (): Promise<boolean> => {
      await appleCalendarCommands.requestContactsAccess();
      return appleCalendarCommands.contactsAccessStatus();
    },
    onError: console.error,
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <main className="relative flex h-screen w-full flex-col items-center justify-center overflow-auto p-4">
        <header
          className={clsx([
            "absolute left-0 right-0 top-0 z-10",
            "flex w-full items-center justify-between",
            "bg-transparent",
            "min-h-11",
          ])}
          data-tauri-drag-region
        />

        <div className="z-10 flex w-full flex-col items-center justify-center">
          <div className="mt-12 flex flex-col gap-12">
            <p className="text-center text-lg font-medium text-neutral-600 md:text-xl lg:text-2xl">
              AI Meeting Notepad that keeps you in flow
            </p>

            <div className="space-y-2">
              <p className="text-center text-lg font-medium md:text-start">
                Required Permissions
              </p>

              <PermissionItem
                label="Transcribe my voice"
                done={micPermission.data}
                handleClick={() => {
                  micPermission.mutate({});
                }}
                buttonTitle="Enable Microphone"
                suffixIcon={<MicIcon size={16} />}
                required
              />
              <PermissionItem
                label="Transcribe other people's voice"
                done={capturePermission.data}
                handleClick={() => {
                  capturePermission.mutate({});
                }}
                buttonTitle="Enable System Audio"
                suffixIcon={<Volume2Icon size={16} />}
                required
              />
            </div>

            {osType.data === "macos" && (
              <div className="space-y-2">
                <p className="text-center text-lg font-medium md:text-start">
                  Optional Permissions
                </p>

                <PermissionItem
                  label="Want to keep track of events?"
                  done={calendarPermission.data}
                  handleClick={() => calendarPermission.mutate({})}
                  buttonTitle={"Connect to Calendar"}
                  suffixIcon={
                    <img
                      src="/icons/calendar.png"
                      alt="Apple Calendar"
                      className="size-4"
                    />
                  }
                />

                <PermissionItem
                  label="How about your contacts?"
                  done={contactsPermission.data}
                  handleClick={() => contactsPermission.mutate({})}
                  buttonTitle="Connect to Contacts"
                  suffixIcon={
                    <img
                      src="/icons/contacts.png"
                      alt="Apple Contacts"
                      className="size-4"
                    />
                  }
                />
              </div>
            )}

            <PushableButton
              onClick={() => {
                navigate({ to: "/app" });
              }}
              className="mb-4"
              disabled={!micPermission.data || !capturePermission.data}
            >
              <Trans>Continue</Trans>
            </PushableButton>
          </div>
        </div>

        <Particles
          className="absolute inset-0 z-0"
          quantity={100}
          ease={80}
          color={"#000000"}
          refresh
        />
      </main>
    </div>
  );
}

interface PermissionItemProps {
  required?: boolean;
  label: string;
  done: boolean | undefined;
  handleClick: () => void;
  buttonTitle: string;
  suffixIcon?: React.ReactNode;
}

function PermissionItem({
  required,
  label,
  done,
  handleClick,
  buttonTitle,
  suffixIcon,
}: PermissionItemProps) {
  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <div>{label}</div>

      {done ? (
        <p>✅</p>
      ) : required ? (
        <ShimmerButton
          onClick={handleClick}
          className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-sm hover:scale-95"
          shimmerColor="#ffffff"
          background="black"
        >
          {buttonTitle}
          {suffixIcon && <div className="size-4">{suffixIcon}</div>}
        </ShimmerButton>
      ) : (
        <button
          className="inline-flex items-center gap-1 rounded-sm bg-neutral-100 px-1.5 py-1 text-sm text-neutral-600 transition-all hover:scale-95 hover:bg-neutral-200"
          onClick={handleClick}
        >
          {buttonTitle}
          {suffixIcon && <div className="size-4">{suffixIcon}</div>}
        </button>
      )}
    </div>
  );
}
