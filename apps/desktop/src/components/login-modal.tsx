import { Trans, useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { message } from "@tauri-apps/plugin-dialog";
import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

import { commands } from "@/types";
import { commands as authCommands, events } from "@hypr/plugin-auth";
import { commands as sfxCommands } from "@hypr/plugin-sfx";
import { Modal, ModalBody } from "@hypr/ui/components/ui/modal";
import { Particles } from "@hypr/ui/components/ui/particles";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";

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

        events.authEvent.listen(({ payload }) => {
          if (payload === "success") {
            commands.setupDbForCloud().then(() => {
              onClose();
              navigate({ to: "/onboarding", replace: true });
            });
            return;
          }

          if (payload.error) {
            message("Error occurred while authenticating!");
            return;
          }
        }).then((fn) => {
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

  const handleStartLocal = () => {
    onClose();
    navigate({ to: "/onboarding" });
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
          <div className="fixed right-4 top-4 z-10">
            <PlayPauseButton />
          </div>

          <div className="z-10 flex w-full max-w-xl mx-auto flex-col items-center justify-center">
            <div className="flex flex-col items-center">
              <TextAnimate
                animation="blurIn"
                as="h1"
                once
                className="mb-6 font-racing-sans text-6xl font-bold md:text-7xl lg:text-8xl"
              >
                {t`HYPRNOTE`}
              </TextAnimate>

              <TextAnimate
                animation="slideUp"
                by="word"
                once
                className="mb-20 text-center text-lg font-medium text-neutral-600 md:text-xl lg:text-2xl"
              >
                {t`AI notepad for meetings`}
              </TextAnimate>

              <PushableButton
                disabled={port === null}
                onClick={handleStartLocal}
                className="mb-4 w-full max-w-sm"
              >
                <Trans>Get Started</Trans>
              </PushableButton>
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

function PlayPauseButton() {
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (isPlaying) {
      sfxCommands.play("BGM");
    } else {
      sfxCommands.stop("BGM");
    }
  }, [isPlaying]);

  return (
    <button
      className="rounded-full p-2 transition-colors hover:bg-neutral-100"
      onClick={() => setIsPlaying(!isPlaying)}
    >
      {isPlaying ? <Pause className="h-4 w-4 text-neutral-600" /> : <Play className="h-4 w-4 text-neutral-600" />}
    </button>
  );
}
