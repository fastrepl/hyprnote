import { useEffect, useState } from "react";
import { Modal, ModalBody } from "@hypr/ui/components/ui/modal";
import { Particles } from "@hypr/ui/components/ui/particles";
import { Button } from "@hypr/ui/components/ui/button";
import { X, ArrowLeft } from "lucide-react";
import { commands as authCommands } from "@hypr/plugin-auth";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { StoryView } from "./story-view";
import { IndustryView } from "./industry-view";
import { RoleView } from "./role-view";
import { OrgSizeView } from "./org-size-view";
import { HowHeardView } from "./how-heard-view";
import { ThankYouView } from "./thank-you-view";

interface IndividualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type UserProfile = {
  industry?: string;
  role?: string;
  orgSize?: string;
  howDidYouHear?: string;
};

export function IndividualizationModal({ isOpen, onClose }: IndividualizationModalProps) {
  const [currentPage, setCurrentPage] = useState<'story' | 'industry' | 'role' | 'orgSize' | 'howHeard' | 'thankYou'>('story');
  const [userProfile, setUserProfile] = useState<UserProfile>({});

  useEffect(() => {
    if (isOpen) {
      setCurrentPage('story');
      setUserProfile({});
    }
  }, [isOpen]);

  const handleStoryComplete = () => {
    setCurrentPage('industry');
  };

  const handleIndustrySelect = (industry: string) => {
    setUserProfile(prev => ({ ...prev, industry }));
    
    if (industry === 'student') {
      setCurrentPage('howHeard');
    } else {
      setCurrentPage('role');
    }
  };

  const handleRoleSelect = (role: string) => {
    setUserProfile(prev => ({ ...prev, role }));
    setCurrentPage('orgSize');
  };

  const handleOrgSizeSelect = (orgSize: string) => {
    setUserProfile(prev => ({ ...prev, orgSize }));
    setCurrentPage('howHeard');
  };

  const handleHowHeardSelect = async (howDidYouHear: string) => {
    const finalProfile = {
      ...userProfile,
      howDidYouHear
    };
    
    let userId = "UNKNOWN";
    try {
      userId = await authCommands.getFromStore("auth-user-id") || "UNKNOWN";
    } catch (error) {
      console.error("Failed to get user ID:", error);
    }
    
    console.log("=== INDIVIDUALIZATION SURVEY COMPLETED ===");
    console.log("User ID (PostHog):", userId);
    console.log("Industry:", finalProfile.industry || "Not selected");
    console.log("Role:", finalProfile.role || "Not selected (student or skipped)");
    console.log("Organization Size:", finalProfile.orgSize || "Not selected (student or skipped)");
    console.log("How they heard about us:", finalProfile.howDidYouHear);
    console.log("Complete Profile Object:", finalProfile);
    console.log("=== END SURVEY DATA ===");
    
    try {
      const analyticsPayload = {
        event: "individualization_survey_completed",
        distinct_id: userId,
        industry: finalProfile.industry || null,
        role: finalProfile.role || null,
        organization_size: finalProfile.orgSize || null,
        how_heard: finalProfile.howDidYouHear,
        is_student: finalProfile.industry === 'student',
        survey_version: "v1",
        completed_at: new Date().toISOString(),
      };

      await analyticsCommands.event(analyticsPayload);
      console.log("✅ Survey data sent to PostHog successfully");
      
    } catch (error) {
      console.error("❌ Failed to send survey data to PostHog:", error);
    }
    
    setCurrentPage('thankYou');
  };

  const handleSkip = async () => {
    console.log("Individualization skipped");
    
    try {
      let userId = "UNKNOWN";
      try {
        userId = await authCommands.getFromStore("auth-user-id") || "UNKNOWN";
      } catch (error) {
        console.error("Failed to get user ID:", error);
      }

      const analyticsPayload = {
        event: "individualization_survey_skipped",
        distinct_id: userId,
        skipped_at_page: currentPage,
        skipped_at: new Date().toISOString(),
      };

      await analyticsCommands.event(analyticsPayload);
      console.log("✅ Survey skip event sent to PostHog");
      
    } catch (error) {
      console.error("❌ Failed to send skip event to PostHog:", error);
    }
    
    onClose();
  };

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
      case 'industry':
        setCurrentPage('story');
        break;
      case 'role':
        setCurrentPage('industry');
        break;
      case 'orgSize':
        setCurrentPage('role');
        break;
      case 'howHeard':
        if (userProfile.industry === 'student') {
          setCurrentPage('industry');
        } else {
          setCurrentPage('orgSize');
        }
        break;
    }
  };

  const showCloseButton = currentPage !== 'story' && currentPage !== 'thankYou';
  const showBackButton = currentPage !== 'story' && currentPage !== 'thankYou';

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      size="full"
      className="bg-background"
      preventClose={currentPage === 'story' || currentPage === 'thankYou'}
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
          {currentPage === 'story' && (
            <StoryView 
              onComplete={handleStoryComplete} 
              onSkip={handleSkip}
            />
          )}
          {currentPage === 'industry' && (
            <IndustryView
              onSelect={handleIndustrySelect}
              onSkip={handleSkip}
            />
          )}
          {currentPage === 'role' && (
            <RoleView
              onSelect={handleRoleSelect}
              onSkip={handleSkip}
            />
          )}
          {currentPage === 'orgSize' && (
            <OrgSizeView
              onSelect={handleOrgSizeSelect}
              onSkip={handleSkip}
            />
          )}
          {currentPage === 'howHeard' && (
            <HowHeardView
              onSelect={handleHowHeardSelect}
              onSkip={handleSkip}
            />
          )}
          {currentPage === 'thankYou' && (
            <ThankYouView
              onContinue={handleThankYouContinue}
            />
          )}
        </div>

        <Particles
          className="absolute inset-0 z-0"
          quantity={currentPage === 'story' || currentPage === 'thankYou' ? 40 : 150}
          ease={80}
          color={"#000000"}
          refresh
        />
      </ModalBody>
    </Modal>
  );
}
