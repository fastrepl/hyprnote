import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";

import { commands } from "@/types";
import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { commands as sfxCommands } from "@hypr/plugin-sfx";
import { Modal, ModalBody } from "@hypr/ui/components/ui/modal";
import { Particles } from "@hypr/ui/components/ui/particles";

import { ModelSelectionView } from "./model-selection-view";
import { WelcomeView } from "./welcome-view";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const selectSTTModel = useMutation({
    mutationFn: (model: SupportedModel) => localSttCommands.setCurrentModel(model),
  });

  useEffect(() => {
    if (isOpen) {
      commands.setOnboardingNeeded(false);
      sfxCommands.play("BGM");
    } else {
      sfxCommands.stop("BGM");
    }
  }, [isOpen]);

  const handleModelSelected = (model: SupportedModel) => {
    selectSTTModel.mutate(model);
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="full"
      className="bg-background"
      preventClose
    >
      <ModalBody className="relative p-0 flex flex-col items-center justify-center overflow-hidden">
        <div className="z-10">
          {true
            ? <WelcomeView />
            : (
              <ModelSelectionView
                onContinue={handleModelSelected}
              />
            )}
        </div>

        <Particles
          className="absolute inset-0 z-0"
          quantity={150}
          ease={80}
          color={"#000000"}
          refresh
        />
      </ModalBody>
    </Modal>
  );
}
