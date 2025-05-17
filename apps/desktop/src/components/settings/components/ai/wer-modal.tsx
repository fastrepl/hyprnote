import { Button } from "@hypr/ui/components/ui/button";
import { Modal, ModalBody, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@hypr/ui/components/ui/modal";
import { cn } from "@hypr/ui/lib/utils";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";

export const werPerformanceData = {
  "Excellent": [
    { "language": "Spanish", "WER": 2.8 },
    { "language": "Italian", "WER": 3.0 },
    { "language": "Korean", "WER": 3.1 },
    { "language": "Portuguese", "WER": 4.0 },
    { "language": "English", "WER": 4.1 },
    { "language": "Polish", "WER": 4.6 },
    { "language": "Catalan", "WER": 4.8 },
    { "language": "Japanese", "WER": 4.8 },
    { "language": "German", "WER": 4.9 },
    { "language": "Russian", "WER": 5.0 },
  ],
  "Good": [
    { "language": "Dutch", "WER": 5.2 },
    { "language": "French", "WER": 5.3 },
    { "language": "Indonesian", "WER": 6.0 },
    { "language": "Ukrainian", "WER": 6.4 },
    { "language": "Turkish", "WER": 6.7 },
    { "language": "Malay", "WER": 7.3 },
    { "language": "Swedish", "WER": 7.6 },
    { "language": "Mandarin", "WER": 7.7 },
    { "language": "Finnish", "WER": 7.7 },
    { "language": "Norwegian", "WER": 7.8 },
  ],
  "Moderate": [
    { "language": "Romanian", "WER": 8.2 },
    { "language": "Thai", "WER": 8.4 },
    { "language": "Vietnamese", "WER": 8.7 },
    { "language": "Slovak", "WER": 9.2 },
    { "language": "Arabic", "WER": 9.6 },
    { "language": "Czech", "WER": 10.1 },
    { "language": "Croatian", "WER": 10.8 },
    { "language": "Greek", "WER": 10.9 },
  ],
  "Weak": [
    { "language": "Serbian", "WER": 11.6 },
    { "language": "Danish", "WER": 12.0 },
    { "language": "Bulgarian", "WER": 12.5 },
    { "language": "Hungarian", "WER": 12.9 },
    { "language": "Filipino", "WER": 13.0 },
    { "language": "Bosnian", "WER": 13.0 },
    { "language": "Galician", "WER": 13.0 },
    { "language": "Macedonian", "WER": 14.8 },
  ],
  "Poor": [
    { "language": "Hindi", "WER": 17.0 },
    { "language": "Estonian", "WER": 18.1 },
    { "language": "Slovenian", "WER": 18.4 },
    { "language": "Tamil", "WER": 18.2 },
    { "language": "Latvian", "WER": 19.4 },
    { "language": "Azerbaijani", "WER": 19.7 },
  ],
};

export function WERPerformanceModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof werPerformanceData>("Excellent");

  return (
    <Modal open={isOpen} onClose={onClose} size="full">
      <ModalHeader className="p-6 pb-2">
        <ModalTitle>
          <Trans>Whisper Model Language Performance (WER)</Trans>
        </ModalTitle>
        <ModalDescription className="mt-1">
          <Trans>
            Word Error Rate (WER) indicates transcription accuracy (lower is better). Data based on the FLEURS dataset,
            measured with OpenAI's Whisper{" "}
            <code className="text-xs font-mono bg-neutral-100 p-0.5 rounded">large-v3-turbo</code> model.{" "}
            <a
              href="https://github.com/openai/whisper/discussions/2363#discussion-7264254"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              More info
            </a>
          </Trans>
        </ModalDescription>
      </ModalHeader>

      <ModalBody className="p-6 flex flex-col">
        <div className="mb-4">
          <div className="flex justify-between rounded-md p-1 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 shadow">
            {(Object.keys(werPerformanceData) as Array<keyof typeof werPerformanceData>).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "py-2 px-3 flex-1 text-center text-xs font-semibold rounded transition-all duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
                  selectedCategory === category
                    ? "bg-white text-black shadow-md"
                    : "text-white hover:bg-white/30",
                )}
              >
                <Trans>{category}</Trans>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-1.5 text-sm">
          {werPerformanceData[selectedCategory].map((lang) => (
            <div
              key={lang.language}
              className="flex justify-between items-center p-2.5 rounded-md bg-neutral-50 hover:bg-neutral-100 transition-colors"
            >
              <span className="text-sm font-medium">
                <Trans>{lang.language}</Trans>
              </span>
              <span className="font-mono text-neutral-600">{lang.WER.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          <Trans>Close</Trans>
        </Button>
      </ModalFooter>
    </Modal>
  );
}
