import { Brain, BrainCircuit, Cpu, HardDrive, X } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";
import { Modal, ModalBody, ModalDescription, ModalTitle } from "@hypr/ui/components/ui/modal";

interface ChatModelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseModel: () => void;
}

export function ChatModelInfoModal({ isOpen, onClose, onChooseModel }: ChatModelInfoModalProps) {
    const handleClose = () => {
      onClose();
    };
  
    
    if (!isOpen) {
      return null;
    }
  
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={handleClose} />
  
        <Modal
          open={isOpen}
          onClose={handleClose}
          size="md"
          showOverlay={false}
          className="bg-background w-[480px] max-w-[90vw]"
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
  
            <ModalBody className="p-6">
              <div className="mb-4 text-center">
                <ModalTitle className="text-xl font-semibold text-foreground">
                  Which model should I use for Chat?
                </ModalTitle>
              </div>
  
              <ModalDescription className="text-neutral-600 text-sm mb-6">
                <button
                  onClick={onChooseModel}
                  className="underline hover:text-neutral-800 transition-colors cursor-pointer"
                >
                  Choose
                </button>{" "}
                based on your priorities:
              </ModalDescription>
  
              {/* Model tiers diagram */}
              <div className="space-y-3 mb-6">
                {/* Ultimate */}
                <div className="flex items-center gap-3">
                  <BrainCircuit className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-base">Ultimate</span>
                      <span className="text-xs text-neutral-900 font-medium">HyprCloud</span>
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">Optimized, tool calling, MCP, web search, etc</div>
                  </div>
                </div>
  
                {/* Advanced */}
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-base">Advanced</span>
                      <span className="text-xs text-neutral-900 font-medium">GPT-4.1, Sonnet, GPT-4o, GPT-5</span>
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">Tool calling, MCP</div>
                  </div>
                </div>
  
                {/* Standard */}
                <div className="flex items-center gap-3">
                  <Cpu className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-base">Standard</span>
                      <span className="text-xs text-neutral-900 font-medium">Other custom endpoint cloud models</span>
                    </div>
                  </div>
                </div>
  
                {/* Baseline */}
                <div className="flex items-center gap-3">
                  <HardDrive className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-base">Basic</span>
                      <span className="text-xs text-neutral-900 font-medium">Local models</span>
                    </div>
                  </div>
                </div>
              </div>
  
              {/* Close button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleClose}
                  className="bg-black text-white hover:bg-neutral-800"
                >
                  Got it!
                </Button>
              </div>
            </ModalBody>
          </div>
        </Modal>
      </>
    );
  }
