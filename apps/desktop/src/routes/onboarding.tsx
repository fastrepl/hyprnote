import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MicIcon, Volume2Icon } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import clsx from "clsx";

import { type OsType, type as getOsType } from "@tauri-apps/plugin-os";

import { commands } from "@/types";
import { Particles } from "@hypr/ui/components/ui/particles";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import ShimmerButton from "@hypr/ui/components/ui/shimmer-button";

export const Route = createFileRoute("/onboarding")({
  component: Component,
});

function Component() {
  const navigate = useNavigate();
  const [osType, setOsType] = useState<OsType>("macos");

  useEffect(() => {
    async function fetchOsType() {
      try {
        const os = getOsType(); // Returns "Linux", "Windows_NT", "Darwin"
        setOsType(os);
      } catch (error) {
        console.error("Failed to get OS type:", error);
      }
    }
    fetchOsType();
  }, []);

  const micPermission = useQuery({
    queryKey: ["permissions", "mic"],
    queryFn: async (): Promise<boolean> => {
      return true;
    },
    refetchInterval: 1000,
  });

  const capturePermission = useQuery({
    queryKey: ["permissions", "capture"],
    queryFn: async (): Promise<boolean> => {
      return true;
    },
    refetchInterval: 1000,
  });

  const handleClickMic = () => {
    commands.openPermissionSettings("microphone");
  };

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
                handleClick={handleClickMic}
                buttonTitle="Enable Microphone"
                suffixIcon={<MicIcon size={16} />}
                required
              />
              <PermissionItem
                label="Transcribe other people's voice"
                done={capturePermission.data}
                handleClick={handleClickMic}
                buttonTitle="Enable System Audio"
                suffixIcon={<Volume2Icon size={16} />}
                required
              />
            </div>

            {osType === "macos" && (
              <div className="space-y-2">
                <p className="text-center text-lg font-medium md:text-start">
                  Optional Permissions
                </p>

                <PermissionItem
                  label="Want to keep track of events?"
                  done={capturePermission.data}
                  handleClick={handleClickMic}
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
                  done={capturePermission.data}
                  handleClick={handleClickMic}
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

            {micPermission.data && capturePermission.data && (
              <PushableButton
                onClick={() => {
                  navigate({ to: "/app" });
                }}
                className="mb-4"
                disabled={!micPermission.data || !capturePermission.data}
              >
                <Trans>Continue</Trans>
              </PushableButton>
            )}
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
