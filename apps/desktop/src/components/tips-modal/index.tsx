import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { Button } from "@hypr/ui/components/ui/button";
import { Modal, ModalBody, ModalDescription, ModalTitle } from "@hypr/ui/components/ui/modal";
import type { TipSlide, TipsModalProps } from "./types";

const tips: TipSlide[] = [
  {
    title: "Hooray for your first meeting summarization!",
    description: "We prepared some pro tips for you! Interested?",
  },
  {
    title: "Edit Transcript",
    description:
      "If you are not satisfied with the transcript quality, you can freely edit it and replace identified speakers to improve accuracy.",
  },
  {
    title: "Transcript Settings",
    description: "You can choose which AI model to use for meeting transcriptions in Settings → Transcription tab.",
  },
  {
    title: "Intelligence Settings",
    description:
      "You can choose which AI model to use for meeting summarization and chat in Settings → Intelligence tab.",
  },
];

export function TipsModal({ isOpen, onClose, userId }: TipsModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < tips.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleClose = () => {
    if (userId) {
      analyticsCommands.event({
        event: "tips_modal_dismiss",
        distinct_id: userId,
      });
    }
    setCurrentSlide(0);
    onClose();
  };

  const handleComplete = () => {
    if (userId) {
      analyticsCommands.event({
        event: "tips_modal_complete",
        distinct_id: userId,
      });
    }
    setCurrentSlide(0);
    onClose();
  };

  // Track slide views
  useEffect(() => {
    if (userId) {
      const events = [
        "tips_modal_intro_show",
        "tips_modal_transcript_show",
        "tips_modal_transcription_show",
        "tips_modal_intelligence_show",
      ];

      const event = events[currentSlide];
      if (event) {
        analyticsCommands.event({
          event,
          distinct_id: userId,
        });
      }
    } else {
      console.error("no userId available for analytics");
    }
  }, [currentSlide, userId]);

  const currentTip = tips[currentSlide];
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === tips.length - 1;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={handleClose} />

      <Modal
        open={isOpen}
        onClose={handleClose}
        size="md"
        showOverlay={false}
        className="bg-background w-[560px] max-w-[90vw]"
      >
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>

          <ModalBody className="p-5">
            <div className="mb-4 text-center">
              <ModalTitle className="text-xl font-semibold text-foreground">
                {currentTip.title}
              </ModalTitle>
            </div>

            <ModalDescription className="text-neutral-600 text-sm text-center mb-4">
              {currentTip.description}
            </ModalDescription>

            {/* Image/GIF placeholder */}
            <div className="flex justify-center mb-4">
              {currentSlide === 0
                ? (
                  <img
                    src="/assets/waving.gif"
                    alt="Celebration animation"
                    className="w-48 h-36 object-contain rounded-md"
                  />
                )
                : currentSlide === 1
                ? (
                  <img
                    src="/assets/transcript-edit.gif"
                    alt="Transcript editing demonstration"
                    className="w-full max-w-lg h-64 object-cover rounded-md"
                    style={{ objectPosition: "center top" }}
                  />
                )
                : currentSlide === 2
                ? (
                  <img
                    src="/assets/transcription-setting.gif"
                    alt="Transcription settings demonstration"
                    className="w-full max-w-lg h-64 object-cover rounded-md"
                    style={{ objectPosition: "center top" }}
                  />
                )
                : (
                  <img
                    src="/assets/intelligence-setting.gif"
                    alt="Intelligence settings demonstration"
                    className="w-full max-w-lg h-64 object-cover rounded-md"
                    style={{ objectPosition: "center top" }}
                  />
                )}
            </div>

            {/* Slide indicator dots */}
            <div className="flex justify-center mb-4">
              {tips.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full mx-1 transition-colors ${
                    index === currentSlide ? "bg-black" : "bg-neutral-300"
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstSlide}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {isLastSlide
                ? (
                  <Button
                    onClick={handleComplete}
                    className="bg-black text-white hover:bg-neutral-800"
                  >
                    Got it!
                  </Button>
                )
                : (
                  <Button
                    onClick={handleNext}
                    className="flex items-center gap-2 bg-black text-white hover:bg-neutral-800"
                  >
                    {isFirstSlide ? "Show Tips!" : "Next"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
            </div>
          </ModalBody>
        </div>
      </Modal>
    </>
  );
}

export type { TipSlide, TipsModalProps } from "./types";
