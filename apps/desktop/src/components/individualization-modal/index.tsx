import { useEffect, useState } from "react";
import { Modal, ModalBody } from "@hypr/ui/components/ui/modal";
import { Particles } from "@hypr/ui/components/ui/particles";
import { Button } from "@hypr/ui/components/ui/button";
import { X } from "lucide-react";
import { StoryView } from "./story-view";
import { IndustryView } from "./industry-view";
import { RoleView } from "./role-view";
import { AboutView } from "./about-view";

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
  const [currentPage, setCurrentPage] = useState<'story' | 'industry' | 'role' | 'about'>('story');
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
    setCurrentPage('role');
  };

  const handleRoleSelect = (role: string) => {
    setUserProfile(prev => ({ ...prev, role }));
    setCurrentPage('about');
  };

  const handleAboutSubmit = (orgSize: string, howDidYouHear: string) => {
    const finalProfile = {
      ...userProfile,
      orgSize,
      howDidYouHear
    };
    
    console.log("User profile completed:", finalProfile);
    // TODO: Send to PostHog later
    onClose();
  };

  const handleSkip = () => {
    console.log("Individualization skipped");
    onClose();
  };

  const handleClose = () => {
    console.log("Individualization modal closed");
    onClose();
  };

  const handleBackToIndustry = () => {
    setCurrentPage('industry');
  };

  const handleBackToRole = () => {
    setCurrentPage('role');
  };

  const showCloseButton = currentPage !== 'story';

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      size="lg"
      className="bg-background"
    >
      <ModalBody className="relative p-8 flex flex-col items-center justify-center overflow-hidden min-h-[500px]">
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

        <div className="z-10 w-full">
          {currentPage === 'story' && (
            <StoryView onComplete={handleStoryComplete} />
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
              onBack={handleBackToIndustry}
            />
          )}
          {currentPage === 'about' && (
            <AboutView
              onSubmit={handleAboutSubmit}
              onSkip={handleSkip}
              onBack={handleBackToRole}
            />
          )}
        </div>

        <Particles
          className="absolute inset-0 z-0"
          quantity={currentPage === 'story' ? 40 : 80}
          ease={80}
          color={"#000000"}
          refresh
        />
      </ModalBody>
    </Modal>
  );
}
