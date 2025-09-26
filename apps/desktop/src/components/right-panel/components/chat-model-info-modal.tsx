import { Shield, Zap, X } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { Modal, ModalBody, ModalDescription, ModalTitle } from "@hypr/ui/components/ui/modal";
import { commands as windowsCommands } from "@hypr/plugin-windows";

interface ChatModelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatModelInfoModal({ isOpen, onClose }: ChatModelInfoModalProps) {
  const handleClose = () => {
    onClose();
  };

  const handleChooseModel = () => {
    windowsCommands.windowShow({ type: "settings" }).then(() => {
      setTimeout(() => {
        windowsCommands.windowEmitNavigate({ type: "settings" }, {
          path: "/app/settings",
          search: { tab: "ai-llm" },
        });
      }, 800);
    });
    handleClose();
  };

  if (!isOpen) return null;

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
                onClick={handleChooseModel}
                className="underline hover:text-neutral-800 transition-colors cursor-pointer"
              >
                Choose
              </button>{" "}
              based on your priorities:
            </ModalDescription>

            {/* Model categories */}
            <div className="space-y-4 mb-6">
              {/* Privacy First */}
              <div className="border rounded-lg p-4">
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-neutral-600" />
                    <h3 className="font-medium text-sm text-neutral-800">If you want maximum privacy</h3>
                  </div>
                  <p className="text-xs text-neutral-600 mb-2">
                    Use local models that run entirely on your device
                  </p>
                </div>
                <div className="text-xs text-neutral-700">
                  <strong>HyprLLM</strong> or models from your <strong>LM Studio</strong> (Qwen, LFM, Llama, etc.)
                  <div className="text-neutral-500 mt-1">• No data sent to cloud • Basic responses</div>
                </div>
              </div>

              {/* Power & Intelligence */}
              <div className="border rounded-lg p-4">
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-neutral-600" />
                    <h3 className="font-medium text-sm text-neutral-800">If you want powerful & smartness</h3>
                  </div>
                  <p className="text-xs text-neutral-600 mb-2">
                    Use cloud AI models with advanced capabilities
                  </p>
                </div>
                
                <div className="space-y-3 text-xs">
                  <div className="pl-3 border-l-2 border-neutral-300">
                    <div className="font-medium text-neutral-800">HyprCloud</div>
                    <div className="text-neutral-600">
                      Maximum power with built-in tools: web search, URL reading, MCP integrations, and agentic workflows by Hyprnote team
                    </div>
                  </div>
                  
                  <div className="pl-3 border-l-2 border-neutral-300">
                    <div className="font-medium text-neutral-800">Custom Endpoints</div>
                    <div className="text-neutral-600">
                      GPT-4.1, Claude Sonnet 4, GPT-4o, GPT-5 with tool calling and MCP support
                    </div>
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
