import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { message } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";

import { showLlmModelDownloadToast, showSttModelDownloadToast } from "@/components/toast/shared";
import { commands } from "@/types";
import { commands as authCommands, events } from "@hypr/plugin-auth";
import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { commands as sfxCommands } from "@hypr/plugin-sfx";
import { Modal, ModalBody } from "@hypr/ui/components/ui/modal";
import { Particles } from "@hypr/ui/components/ui/particles";

import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { AudioPermissionsView } from "./audio-permissions-view";
// import { CalendarPermissionsView } from "./calendar-permissions-view";
import { useHypr } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { DownloadProgressView } from "./download-progress-view";
import { LanguageSelectionView } from "./language-selection-view";
import { ModelSelectionView } from "./model-selection-view";
import { WelcomeView } from "./welcome-view";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userId } = useHypr();
  const [port, setPort] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<
    | "welcome"
    | "model-selection"
    | "download-progress"
    | "audio-permissions"
    | "language-selection"
  >("welcome");
  const [selectedSttModel, setSelectedSttModel] = useState<SupportedModel>("QuantizedSmall");
  const [wentThroughDownloads, setWentThroughDownloads] = useState(false);

  const selectSTTModel = useMutation({
    mutationFn: (model: SupportedModel) => localSttCommands.setCurrentModel(model),
  });

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let unlisten: (() => void) | undefined;

    if (isOpen) {
      authCommands.startOauthServer().then((port) => {
        setPort(port);

        events.authEvent
          .listen(({ payload }) => {
            if (payload === "success") {
              commands.setupDbForCloud().then(() => {
                onClose();
              });
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
      sfxCommands.play("BGM");
    } else {
      sfxCommands.stop("BGM");
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentStep === "audio-permissions" && userId) {
      analyticsCommands.event({
        event: "onboarding_reached_audio",
        distinct_id: userId,
      });
    }
  }, [currentStep, userId]);

  useEffect(() => {
    if (currentStep === "model-selection" && userId) {
      analyticsCommands.event({
        event: "onboarding_reached_model_selection",
        distinct_id: userId,
      });
    }
  }, [currentStep, userId]);

  useEffect(() => {
    if (currentStep === "download-progress" && userId) {
      analyticsCommands.event({
        event: "onboarding_reached_download_progress",
        distinct_id: userId,
      });
    }
  }, [currentStep, userId]);

  useEffect(() => {
    if (currentStep === "language-selection" && userId) {
      analyticsCommands.event({
        event: "onboarding_reached_language_selection",
        distinct_id: userId,
      });
    }
  }, [currentStep, userId]);

  const handleStartLocal = () => {
    setCurrentStep("audio-permissions");
  };

  const handleModelSelected = (model: SupportedModel) => {
    selectSTTModel.mutate(model);
    setSelectedSttModel(model);
    sessionStorage.setItem("model-download-toast-dismissed", "true");
    setCurrentStep("download-progress");
  };

  const handleDownloadProgressContinue = () => {
    setWentThroughDownloads(true);
    setCurrentStep("language-selection");
  };

  const handleAudioPermissionsContinue = () => {
    setCurrentStep("model-selection");
  };

  const handleLanguageSelectionContinue = async (languages: string[]) => {
    try {
      const config = await dbCommands.getConfig();
      await dbCommands.setConfig({
        ...config,
        general: {
          ...config.general,
          spoken_languages: languages,
        },
      });
    } catch (error) {
      console.error("Failed to save language preferences:", error);
    }

    commands.setOnboardingNeeded(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen && wentThroughDownloads) {
      localSttCommands.startServer();
      localLlmCommands.startServer();

      const checkAndShowToasts = async () => {
        try {
          const sttModelExists = await localSttCommands.isModelDownloaded(selectedSttModel as SupportedModel);
          const llmModelExists = await localLlmCommands.isModelDownloaded("HyprLLM");

          if (!sttModelExists) {
            showSttModelDownloadToast(selectedSttModel, undefined, queryClient);
          }

          if (!llmModelExists) {
            showLlmModelDownloadToast("HyprLLM", undefined, queryClient);
          }
        } catch (error) {
          console.error("Error checking model download status:", error);
        }
      };

      checkAndShowToasts();
    }
  }, [isOpen, wentThroughDownloads, selectedSttModel, queryClient]);

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
          {currentStep === "welcome" && (
            <WelcomeView
              portReady={port !== null}
              onGetStarted={handleStartLocal}
            />
          )}
          {currentStep === "model-selection" && (
            <ModelSelectionView
              onContinue={handleModelSelected}
            />
          )}
          {currentStep === "download-progress" && (
            <DownloadProgressView
              selectedSttModel={selectedSttModel}
              onContinue={handleDownloadProgressContinue}
            />
          )}
          {currentStep === "audio-permissions" && (
            <AudioPermissionsView
              onContinue={handleAudioPermissionsContinue}
            />
          )}
          {currentStep === "language-selection" && (
            <LanguageSelectionView
              onContinue={handleLanguageSelectionContinue}
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
