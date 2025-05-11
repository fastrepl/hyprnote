import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { message } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";

import { baseUrl } from "@/client";
import { commands } from "@/types";
import { commands as authCommands, events } from "@hypr/plugin-auth";
import { commands as sfxCommands } from "@hypr/plugin-sfx";
import { Modal, ModalBody } from "@hypr/ui/components/ui/modal";
import { Particles } from "@hypr/ui/components/ui/particles";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { cn } from "@hypr/ui/lib/utils";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const navigate = useNavigate();
  const { t } = useLingui();

  const [port, setPort] = useState<number | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let unlisten: (() => void) | undefined;

    if (isOpen) {
      authCommands.startOauthServer().then((port) => {
        setPort(port);

        events.authEvent
          .listen(({ payload }) => {
            if (payload === "success") {
              message("Successfully authenticated!");
              return;
            }

            if (payload.error) {
              message("Error occurred while authenticating!");
              return;
            }
          })
          .then((fn) => {
            unlisten = fn;
          });

        cleanup = () => {
          unlisten?.();
          authCommands.stopOauthServer(port);
        };
      });
    }

    return () => cleanup?.();
  }, [isOpen, onClose, navigate]);

  useEffect(() => {
    if (isOpen) {
      commands.setOnboardingNeeded(false);
      sfxCommands.play("BGM");
    } else {
      sfxCommands.stop("BGM");
    }
  }, [isOpen]);

  const url = useQuery({
    queryKey: ["oauth-url", port],
    enabled: !!port,
    queryFn: () => {
      const u = new URL(baseUrl);
      u.pathname = "/auth/connect";
      u.searchParams.set("c", window.crypto.randomUUID());
      u.searchParams.set("f", "fingerprint");
      u.searchParams.set("p", port!.toString());
      return u.toString();
    },
  });

  const handleStartCloud = () => {
    if (url.data) {
      openUrl(url.data);
    }
  };

  const handleStartLocal = () => {
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="full"
      className="bg-background"
    >
      <ModalBody className="p-0">
        <div className="relative flex h-full w-full flex-col items-center justify-center p-8">
          <div className="z-10 flex w-full max-w-xl mx-auto flex-col items-center justify-center">
            <div className="flex flex-col items-center">
              <img
                src="/assets/logo.svg"
                alt="HYPRNOTE"
                className="mb-6 w-[300px]"
              />

              <TextAnimate
                animation="slideUp"
                by="word"
                once
                className="mb-20 text-center text-2xl font-medium text-neutral-600"
              >
                {t`AI notepad for meetings`}
              </TextAnimate>

              <PushableButton
                disabled={port === null}
                onClick={handleStartCloud}
                className="mb-4 w-full max-w-sm"
              >
                <Trans>Get Started</Trans>
              </PushableButton>

              <button
                disabled={port === null}
                onClick={handleStartLocal}
                className={cn([
                  "max-w-sm hover:bg-neutral-100 py-0.5 px-2 rounded-md",
                  "text-neutral-500 hover:text-neutral-800",
                ])}
              >
                <Trans>or, just use it locally</Trans>
              </button>
            </div>
          </div>

          <Particles
            className="absolute inset-0 z-0"
            quantity={150}
            ease={80}
            color={"#000000"}
            refresh
          />
        </div>
      </ModalBody>
    </Modal>
  );
}
