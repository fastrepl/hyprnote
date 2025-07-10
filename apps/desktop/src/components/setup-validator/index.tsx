import { useState } from "react";

import { Modal, ModalBody } from "@hypr/ui/components/ui/modal";
import { Particles } from "@hypr/ui/components/ui/particles";

import { PermissionsValidationView } from "./permissions-validation-view";
import { SetupCompleteView } from "./setup-complete-view";

interface SetupValidatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetupValidatorModal({ isOpen, onClose }: SetupValidatorModalProps) {
  const [currentView, setCurrentView] = useState<"permissions" | "complete">("permissions");

  const handlePermissionsComplete = () => {
    setCurrentView("complete");
  };

  const handleSetupComplete = () => {
    onClose();
  };

  const handleSkipToApp = () => {
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="full"
      className="bg-background"
      preventClose={false}
    >
      <ModalBody className="relative p-0 flex flex-col items-center justify-center overflow-hidden">
        <div className="z-10 w-full max-w-lg">
          {currentView === "permissions" && (
            <PermissionsValidationView
              onComplete={handlePermissionsComplete}
              onSkipToApp={handleSkipToApp}
            />
          )}
          {currentView === "complete" && (
            <SetupCompleteView
              onComplete={handleSetupComplete}
            />
          )}
        </div>

        <Particles
          className="absolute inset-0 z-0"
          quantity={30}
          ease={80}
          color={"#000000"}
          refresh
        />
      </ModalBody>
    </Modal>
  );
}
