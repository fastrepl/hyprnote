import { Trans } from "@lingui/react/macro";
import React, { useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@hypr/ui/components/ui/hover-card";

// TODO
export const useMicrophones = () => {
  const [selectedMic, setSelectedMic] = useState<string>("default");

  // Mock data for available microphones
  const microphones = [
    { id: "default", name: "System Default" },
    { id: "headset", name: "Logitech G Pro X Headset" },
    { id: "webcam", name: "Logitech C920 Webcam" },
    { id: "usb", name: "Blue Yeti USB Microphone" },
    { id: "bluetooth", name: "AirPods Pro" },
  ];

  return {
    microphones,
    selectedMic,
    setSelectedMic,
    isLoading: false,
    error: null,
  };
};

export const MicrophoneSelector = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { microphones, selectedMic, setSelectedMic } = useMicrophones();

  return (
    <HoverCard openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-60" align="end" side="bottom">
        <div className="space-y-2">
          <div className="font-medium">
            <Trans>Select Microphone</Trans>
          </div>

          <div>
            {microphones.map((mic) => (
              <div
                key={mic.id}
                className={`flex items-center space-x-3 rounded-md p-2 hover:bg-neutral-100 cursor-pointer ${
                  selectedMic === mic.id ? "bg-neutral-50" : ""
                }`}
                onClick={() => setSelectedMic(mic.id)}
              >
                <div
                  className={`h-4 w-4 rounded-full border border-neutral-300 flex items-center justify-center ${
                    selectedMic === mic.id ? "border-primary" : ""
                  }`}
                >
                  {selectedMic === mic.id && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-xs">{mic.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
