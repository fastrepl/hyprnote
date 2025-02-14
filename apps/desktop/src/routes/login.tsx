import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-shell";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { message } from "@tauri-apps/plugin-dialog";
import { commands } from "@/types";
import { baseUrl } from "@/client";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { Particles } from "@hypr/ui/components/ui/particles";
import { CircleCheck, MicIcon, Volume2Icon } from "lucide-react";
import clsx from "clsx";
import { type OsType, type as getOsType } from "@tauri-apps/plugin-os";

export const Route = createFileRoute("/login")({
  component: Component,
  loader: async () => {
    // TODO
    // const fingerprint = await commands.getFingerprint();
    return {
      code: window.crypto.randomUUID(),
      fingerprint: "",
    };
  },
});

function Component() {
  const { code } = Route.useLoaderData();

  const [port, setPort] = useState<number | null>(null);
  const [osType, setOsType] = useState<OsType>("macos");

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    commands.startOauthServer().then((port) => {
      setPort(port);
      cleanup = () => {
        commands.cancelOauthServer(port);
      };
    });

    return () => cleanup?.();
  }, []);

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

  const url = useQuery({
    queryKey: ["oauth-url", port],
    enabled: !!port,
    queryFn: () => {
      const u = new URL(baseUrl);
      u.pathname = "/auth/connect";
      u.searchParams.set("c", code);
      u.searchParams.set("f", "fingerprint");
      u.searchParams.set("p", port!.toString());
      return u.toString();
    },
  });

  const handleSignIn = () => {
    if (url.data) {
      open(url.data);
    } else {
      message("Failed to start authentication process!");
    }
  };

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
    <main className="relative flex h-screen flex-col items-center justify-center overflow-auto p-4">
      <header
        className={clsx([
          "absolute left-0 right-0 top-0 z-10",
          "flex w-full items-center justify-between",
          "bg-transparent",
          "min-h-11",
        ])}
        data-tauri-drag-region
      />

      <div className="z-10 flex w-full flex-col items-center justify-center md:flex-row md:space-x-32">
        <div className="flex flex-col items-center md:items-start">
          <h1 className="mb-4 font-racing-sans text-6xl font-bold md:text-7xl lg:text-8xl">
            Hyprnote
          </h1>

          <p className="mb-12 text-center text-lg font-medium text-neutral-600 md:text-xl lg:text-2xl">
            AI Meeting Notepad that keeps you in flow
          </p>

          <PushableButton onClick={handleSignIn} className="mb-2">
            <Trans>Get Started</Trans>
          </PushableButton>

          <p className="text-xs text-neutral-400">
            By logging in, I agree to the{" "}
            <a
              href="https://hyprnote.com/docs/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="decoration-dotted hover:underline"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://hyprnote.com/docs/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="decoration-dotted hover:underline"
            >
              Privacy Policy
            </a>
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-12 md:mt-0">
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
            />
            <PermissionItem
              label="Transcribe other people's voice"
              done={capturePermission.data}
              handleClick={handleClickMic}
              buttonTitle="Enable System Audio"
              suffixIcon={<Volume2Icon size={16} />}
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
  );
}

interface PermissionItemProps {
  label: string;
  done: boolean | undefined;
  handleClick: () => void;
  buttonTitle: string;
  suffixIcon?: React.ReactNode;
}

function PermissionItem({
  label,
  done,
  handleClick,
  buttonTitle,
  suffixIcon,
}: PermissionItemProps) {
  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <div>{label}</div>

      {!done ? (
        <CircleCheck size={16} color="green" />
      ) : (
        <button
          className="inline-flex items-center gap-1 rounded-sm bg-neutral-100 px-1.5 py-1 text-sm text-neutral-600 hover:text-neutral-900"
          onClick={handleClick}
        >
          {buttonTitle}
          {suffixIcon && <div className="size-4">{suffixIcon}</div>}
        </button>
      )}
    </div>
  );
}
