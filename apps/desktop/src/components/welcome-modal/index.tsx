import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { message } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";

import { commands } from "@/types";
import { commands as authCommands, events } from "@hypr/plugin-auth";
import { commands as localSttCommands, SupportedModel } from "@hypr/plugin-local-stt";
import { commands as sfxCommands } from "@hypr/plugin-sfx";
import { Modal, ModalBody } from "@hypr/ui/components/ui/modal";
import { Particles } from "@hypr/ui/components/ui/particles";

import { useHypr } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { Button } from "@hypr/ui/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { HowHeardView } from "../individualization-modal/how-heard-view";
import { IndustryView } from "../individualization-modal/industry-view";
import { OrgSizeView } from "../individualization-modal/org-size-view";
import { RoleView } from "../individualization-modal/role-view";
import { StoryView } from "../individualization-modal/story-view";
import { ThankYouView } from "../individualization-modal/thank-you-view";
import { PermissionsValidationView } from "../setup-validator/permissions-validation-view";
import { SetupCompleteView } from "../setup-validator/setup-complete-view";
import { CalendarLinkingView } from "./calendar-linking-view";
import { ModelSelectionView } from "./model-selection-view";
import { WelcomeView } from "./welcome-view";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  shouldShowSurvey?: boolean;
  surveyOnly?: boolean;
}

type OnboardingStep =
  | "welcome"
  | "model-selection"
  | "calendar-linking"
  | "survey-story"
  | "survey-industry"
  | "survey-role"
  | "survey-orgsize"
  | "survey-howheard"
  | "survey-thankyou"
  | "permissions-validation"
  | "setup-complete";

type UserProfile = {
  industry?: string;
  role?: string;
  orgSize?: string;
  howDidYouHear?: string;
};

export function WelcomeModal({ isOpen, onClose, shouldShowSurvey = true, surveyOnly = false }: WelcomeModalProps) {
  const navigate = useNavigate();
  const { userId } = useHypr();
  const [port, setPort] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [userProfile, setUserProfile] = useState<UserProfile>({});

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
      commands.setOnboardingNeeded(false);
      sfxCommands.play("BGM");
      setCurrentStep(surveyOnly ? "survey-story" : "welcome");
      setUserProfile({});
    } else {
      sfxCommands.stop("BGM");
    }
  }, [isOpen, surveyOnly]);

  const handleStartLocal = () => {
    if (shouldShowSurvey) {
      setCurrentStep("survey-story");
    } else {
      setCurrentStep("model-selection");
    }
  };

  const handleModelSelected = (model: SupportedModel) => {
    selectSTTModel.mutate(model);
    // Don't change step immediately - let ModelSelectionView complete first
  };

  const handleModelSelectionComplete = (model: SupportedModel) => {
    setCurrentStep("calendar-linking");
  };

  const handleCalendarLinkingComplete = () => {
    setCurrentStep("permissions-validation");
  };

  const handleCalendarLinkingSkip = () => {
    setCurrentStep("permissions-validation");
  };

  const handleSurveyStoryComplete = () => {
    setCurrentStep("survey-industry");
  };

  const handleSurveyIndustrySelect = (industry: string) => {
    setUserProfile(prev => ({ ...prev, industry }));
    if (industry === "student") {
      setCurrentStep("survey-howheard");
    } else {
      setCurrentStep("survey-role");
    }
  };

  const handleSurveyRoleSelect = (role: string) => {
    setUserProfile(prev => ({ ...prev, role }));
    setCurrentStep("survey-orgsize");
  };

  const handleSurveyOrgSizeSelect = (orgSize: string) => {
    setUserProfile(prev => ({ ...prev, orgSize }));
    setCurrentStep("survey-howheard");
  };

  const handleSurveyHowHeardSelect = async (howDidYouHear: string) => {
    const finalProfile = { ...userProfile, howDidYouHear };
    setUserProfile(finalProfile);

    try {
      await analyticsCommands.event({
        event: "survey_completed",
        distinct_id: userId,
        survey_version: "v1",
        completed_at: new Date().toISOString(),
        $set: {
          industry: finalProfile.industry,
          role: finalProfile.role,
          organization_size: finalProfile.orgSize,
          how_heard: finalProfile.howDidYouHear,
        },
      });
    } catch (error) {
      console.error("Failed to send survey data:", error);
    }

    setCurrentStep("survey-thankyou");
  };

  const handleSurveyThankYouContinue = () => {
    if (surveyOnly) {
      commands.setIndividualizationNeeded(false);
      onClose();
    } else {
      setCurrentStep("model-selection");
    }
  };

  const handlePermissionsComplete = () => {
    setCurrentStep("setup-complete");
  };

  const handleSetupComplete = () => {
    commands.setOnboardingNeeded(false);
    commands.setIndividualizationNeeded(false);
    onClose();
  };

  const handleSurveySkip = useMutation({
    mutationFn: (step: OnboardingStep) =>
      analyticsCommands.event({
        event: "individualization_survey_skipped",
        distinct_id: userId,
        skipped_at_page: step,
        skipped_at: new Date().toISOString(),
      }),
    onSettled: () => {
      if (surveyOnly) {
        commands.setIndividualizationNeeded(false);
        onClose();
      } else {
        setCurrentStep("model-selection");
      }
    },
  });

  const handleBack = () => {
    switch (currentStep) {
      case "survey-story":
        if (surveyOnly) {
          onClose();
        } else {
          setCurrentStep("welcome");
        }
        break;
      case "survey-industry":
        setCurrentStep("survey-story");
        break;
      case "survey-role":
        setCurrentStep("survey-industry");
        break;
      case "survey-orgsize":
        setCurrentStep("survey-role");
        break;
      case "survey-howheard":
        if (userProfile.industry === "student") {
          setCurrentStep("survey-industry");
        } else {
          setCurrentStep("survey-orgsize");
        }
        break;
      case "model-selection":
        if (shouldShowSurvey) {
          setCurrentStep("survey-thankyou");
        } else {
          setCurrentStep("welcome");
        }
        break;
      case "calendar-linking":
        setCurrentStep("model-selection");
        break;
      case "permissions-validation":
        setCurrentStep("calendar-linking");
        break;
      case "setup-complete":
        setCurrentStep("permissions-validation");
        break;
    }
  };

  const handleClose = () => {
    if (currentStep === "setup-complete") {
      handleSetupComplete();
    } else {
      handleSurveySkip.mutate(currentStep);
    }
  };

  const showBackButton = !surveyOnly && currentStep !== "welcome" && currentStep !== "survey-story"
    && currentStep !== "survey-thankyou";
  const showCloseButton = !surveyOnly && currentStep !== "welcome" && currentStep !== "survey-story"
    && currentStep !== "survey-thankyou";

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      size="full"
      className="bg-background"
      preventClose={(!surveyOnly
        && (currentStep === "welcome" || currentStep === "survey-story" || currentStep === "survey-thankyou"))
        || (surveyOnly && (currentStep === "survey-story" || currentStep === "survey-thankyou"))}
    >
      <ModalBody className="relative p-0 flex flex-col items-center justify-center overflow-hidden">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="absolute top-4 left-4 z-20 h-8 w-8 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        {showCloseButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <div className="z-10">
          {currentStep === "welcome" && (
            <WelcomeView
              portReady={port !== null}
              onGetStarted={handleStartLocal}
            />
          )}
          {currentStep === "model-selection" && (
            <ModelSelectionView
              onContinue={handleModelSelectionComplete}
              onModelSelected={handleModelSelected}
            />
          )}
          {currentStep === "calendar-linking" && (
            <CalendarLinkingView
              onComplete={handleCalendarLinkingComplete}
              onSkip={handleCalendarLinkingSkip}
            />
          )}
          {currentStep === "survey-story" && (
            <StoryView
              onComplete={handleSurveyStoryComplete}
              onSkip={() => handleSurveySkip.mutate(currentStep)}
            />
          )}
          {currentStep === "survey-industry" && (
            <IndustryView
              onSelect={handleSurveyIndustrySelect}
              onSkip={() => handleSurveySkip.mutate(currentStep)}
              selectedIndustry={userProfile.industry}
            />
          )}
          {currentStep === "survey-role" && (
            <RoleView
              onSelect={handleSurveyRoleSelect}
              onSkip={() => handleSurveySkip.mutate(currentStep)}
              selectedRole={userProfile.role}
            />
          )}
          {currentStep === "survey-orgsize" && (
            <OrgSizeView
              onSelect={handleSurveyOrgSizeSelect}
              onSkip={() => handleSurveySkip.mutate(currentStep)}
              selectedOrgSize={userProfile.orgSize}
            />
          )}
          {currentStep === "survey-howheard" && (
            <HowHeardView
              onSelect={handleSurveyHowHeardSelect}
              onSkip={() => handleSurveySkip.mutate(currentStep)}
              selectedHowHeard={userProfile.howDidYouHear}
            />
          )}
          {currentStep === "survey-thankyou" && (
            <ThankYouView
              onContinue={handleSurveyThankYouContinue}
            />
          )}
          {currentStep === "permissions-validation" && (
            <PermissionsValidationView
              onComplete={handlePermissionsComplete}
              onSkipToApp={handleSetupComplete}
            />
          )}
          {currentStep === "setup-complete" && (
            <SetupCompleteView
              onComplete={handleSetupComplete}
            />
          )}
        </div>

        <Particles
          className="absolute inset-0 z-0"
          quantity={currentStep === "survey-story" || currentStep === "survey-thankyou" ? 40 : 150}
          ease={80}
          color={"#000000"}
          refresh
        />
      </ModalBody>
    </Modal>
  );
}
