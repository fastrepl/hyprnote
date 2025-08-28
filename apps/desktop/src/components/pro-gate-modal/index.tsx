import type { LinkProps } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useState } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { Modal, ModalBody, ModalDescription, ModalTitle } from "@hypr/ui/components/ui/modal";
import { cn } from "@hypr/ui/lib/utils";
import type { ProGateModalProps } from "./types";

export function ProGateModal({ isOpen, onClose, type }: ProGateModalProps) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

  const getContent = () => {
    if (type === "template") {
      return {
        description:
          "You've reached the custom template limit for free users. Please upgrade your account to continue.",
      };
    } else {
      return {
        description: "4 messages are allowed per conversation for free users. Upgrade to pro for unlimited chat.",
      };
    }
  };

  const { description } = getContent();

  const pricing = {
    monthly: { price: "$8", period: "/mo", billing: "(billed monthly)" },
    yearly: { price: "$59", period: "/yr", billing: "(billed annually, save $37)" },
  };

  const handleUpgrade = () => {
    onClose();

    windowsCommands.windowShow({ type: "settings" }).then(() => {
      const params = { to: "/app/settings", search: { tab: "billing" } } as const satisfies LinkProps;

      setTimeout(() => {
        windowsCommands.windowEmitNavigate({ type: "settings" }, {
          path: params.to,
          search: params.search,
        });
      }, 500);
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={onClose} />

      <Modal
        open={isOpen}
        onClose={onClose}
        size="md"
        showOverlay={false}
        className="bg-background w-[448px] max-w-[90vw]"
      >
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>

          <ModalBody className="p-5">
            <div className="mb-4">
              <ModalTitle className="text-xl font-semibold text-foreground">
                Upgrade to Pro
              </ModalTitle>
            </div>

            <ModalDescription className="text-neutral-600 text-sm text-center mb-5">
              {description}
            </ModalDescription>

            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 mb-5">
              <div className="flex justify-end mb-2">
                <div className="flex border border-neutral-200 rounded-md p-0.5 bg-white">
                  <button
                    onClick={() => setInterval("monthly")}
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded-sm transition-all",
                      interval === "monthly"
                        ? "bg-neutral-100 text-black"
                        : "text-neutral-600 hover:text-neutral-800",
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setInterval("yearly")}
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded-sm transition-all",
                      interval === "yearly"
                        ? "bg-neutral-100 text-black"
                        : "text-neutral-600 hover:text-neutral-800",
                    )}
                  >
                    Annual
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-black">
                    {pricing[interval].price}
                    <span className="text-sm font-normal text-neutral-500 ml-1">
                      {interval === "yearly" ? "Per year" : "Per month"}
                    </span>
                  </div>
                  {interval === "yearly" && <div className="text-xs text-green-600 font-medium">Save 39%</div>}
                </div>
                {interval === "yearly" && (
                  <div className="text-right">
                    <div className="text-green-600 font-medium text-sm">$4.92/month</div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-5">
              <ul className="space-y-2.5">
                <li className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-white border border-black flex items-center justify-center mr-3">
                    <Check className="w-2.5 h-2.5 text-black" />
                  </div>
                  <span className="text-sm text-neutral-700">Unlimited Templates & AI Chat</span>
                </li>
                <li className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-white border border-black flex items-center justify-center mr-3">
                    <Check className="w-2.5 h-2.5 text-black" />
                  </div>
                  <span className="text-sm text-neutral-700">Superior STT models</span>
                </li>
                <li className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-white border border-black flex items-center justify-center mr-3">
                    <Check className="w-2.5 h-2.5 text-black" />
                  </div>
                  <span className="text-sm text-neutral-700">HyprCloud (Cloud LLM hosted by us)</span>
                </li>
                <li className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-white border border-black flex items-center justify-center mr-3">
                    <Check className="w-2.5 h-2.5 text-black" />
                  </div>
                  <span className="text-sm text-neutral-700">Priority support</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={handleUpgrade}
              className="w-full py-2.5 bg-black text-white hover:bg-neutral-800 rounded-lg font-medium"
            >
              Get Pro Plan
            </Button>
          </ModalBody>
        </div>
      </Modal>
    </>
  );
}

export type { ProGateModalProps, ProGateType } from "./types";
