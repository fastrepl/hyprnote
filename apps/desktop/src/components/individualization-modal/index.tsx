import { ArrowLeft, X } from "lucide-react";
import { useEffect, useState } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { Button } from "@hypr/ui/components/ui/button";
import { Modal, ModalBody } from "@hypr/ui/components/ui/modal";
import { Particles } from "@hypr/ui/components/ui/particles";

import { useHypr } from "@/contexts";
import { useMutation } from "@tanstack/react-query";
import { HowHeardView } from "./how-heard-view";
import { IndustryView } from "./industry-view";
import { OrgSizeView } from "./org-size-view";
import { RoleView } from "./role-view";
import { StoryView } from "./story-view";
import { ThankYouView } from "./thank-you-view";

interface IndividualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type UserProfile = {
  industry?: string;
  role?: string;
  orgSize?: string;
  howDidYouHear?: string;
};

export function IndividualizationModal({ isOpen, onClose }: IndividualizationModalProps) {
  const { userId } = useHypr();

  const [currentPage, setCurrentPage] = useState<"story" | "industry" | "role" | "orgSize" | "howHeard" | "thankYou">(
    "story",
  );
  const [userProfile, setUserProfile] = useState<UserProfile>({});

  useEffect(() => {
    if (isOpen) {
      setCurrentPage("story");
      setUserProfile({});
    }
  }, [isOpen]);

  const handleStoryComplete = () => {
    setCurrentPage("industry");
  };

  const handleIndustrySelect = (industry: string) => {
    setUserProfile(prev => ({ ...prev, industry }));

    if (industry === "student") {
      setCurrentPage("howHeard");
    } else {
      setCurrentPage("role");
    }
  };

  const handleRoleSelect = (role: string) => {
    setUserProfile(prev => ({ ...prev, role }));
    setCurrentPage("orgSize");
  };

  const handleOrgSizeSelect = (orgSize: string) => {
    setUserProfile(prev => ({ ...prev, orgSize }));
    setCurrentPage("howHeard");
  };

  const handleHowHeardSelect = async (howDidYouHear: string) => {
    const finalProfile = {
      ...userProfile,
      howDidYouHear,
    };

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
      console.log("Survey data sent to PostHog successfully");
    } catch (error) {
      console.error("Failed to send survey data to PostHog:", error);
    }

    setCurrentPage("thankYou");
  };

  const handleSurveySkip = useMutation({
    mutationFn: () =>
      analyticsCommands.event({
        event: "individualization_survey_skipped",
        distinct_id: userId,
        skipped_at_page: currentPage,
        skipped_at: new Date().toISOString(),
      }),
    onError: (e) => console.error(e),
    onSettled: () => onClose(),
  });

  const handleThankYouContinue = () => {
    console.log("Thank you completed, closing modal");
    onClose();
  };

  const handleClose = () => {
    console.log("Individualization modal closed");
    onClose();
  };

  const handleBack = () => {
    switch (currentPage) {
      case "industry":
        setCurrentPage("story");
        break;
      case "role":
        setCurrentPage("industry");
        break;
      case "orgSize":
        setCurrentPage("role");
        break;
      case "howHeard":
        if (userProfile.industry === "student") {
          setCurrentPage("industry");
        } else {
          setCurrentPage("orgSize");
        }
        break;
    }
  };

  const showCloseButton = currentPage !== "story" && currentPage !== "thankYou";
  const showBackButton = currentPage !== "story" && currentPage !== "thankYou";

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      size="full"
      className="bg-background"
      preventClose={currentPage === "story" || currentPage === "thankYou"}
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
          {currentPage === "story" && (
            <StoryView
              onComplete={handleStoryComplete}
              onSkip={handleSurveySkip.mutate}
            />
          )}
          {currentPage === "industry" && (
            <IndustryView
              onSelect={handleIndustrySelect}
              onSkip={handleSurveySkip.mutate}
              selectedIndustry={userProfile.industry}
            />
          )}
          {currentPage === "role" && (
            <RoleView
              onSelect={handleRoleSelect}
              onSkip={handleSurveySkip.mutate}
              selectedRole={userProfile.role}
            />
          )}
          {currentPage === "orgSize" && (
            <OrgSizeView
              onSelect={handleOrgSizeSelect}
              onSkip={handleSurveySkip.mutate}
              selectedOrgSize={userProfile.orgSize}
            />
          )}
          {currentPage === "howHeard" && (
            <HowHeardView
              onSelect={handleHowHeardSelect}
              onSkip={handleSurveySkip.mutate}
              selectedHowHeard={userProfile.howDidYouHear}
            />
          )}
          {currentPage === "thankYou" && (
            <ThankYouView
              onContinue={handleThankYouContinue}
            />
          )}
        </div>

        <Particles
          className="absolute inset-0 z-0"
          quantity={currentPage === "story" || currentPage === "thankYou" ? 40 : 150}
          ease={80}
          color={"#000000"}
          refresh
        />
      </ModalBody>
    </Modal>
  );
}
