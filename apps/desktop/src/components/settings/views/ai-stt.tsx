import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import { showSttModelDownloadToast } from "../../toast/shared";
import { SharedSTTProps, STTModel } from "../components/ai/shared";
import { STTViewLocal } from "../components/ai/stt-view-local";
import { STTViewRemote } from "../components/ai/stt-view-remote";

export default function SttAI() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"local" | "custom">("local");

  const [isWerModalOpen, setIsWerModalOpen] = useState(false);
  const [selectedSTTModel, setSelectedSTTModel] = useState("QuantizedTiny");
  const [sttModels, setSttModels] = useState(initialSttModels);
  const [downloadingModels, setDownloadingModels] = useState<Set<string>>(new Set());

  const handleModelDownload = async (modelKey: string) => {
    setDownloadingModels(prev => new Set([...prev, modelKey]));

    showSttModelDownloadToast(modelKey as any, () => {
      setSttModels(prev =>
        prev.map(model =>
          model.key === modelKey
            ? { ...model, downloaded: true }
            : model
        )
      );
      setDownloadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelKey);
        return newSet;
      });

      setSelectedSTTModel(modelKey);
      localSttCommands.setCurrentModel(modelKey as any);
    }, queryClient);
  };

  const sttProps: SharedSTTProps & { isWerModalOpen: boolean; setIsWerModalOpen: (open: boolean) => void } = {
    selectedSTTModel,
    setSelectedSTTModel,
    sttModels,
    setSttModels,
    downloadingModels,
    handleModelDownload,
    isWerModalOpen,
    setIsWerModalOpen,
  };

  return (
    <div className="space-y-8">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "local" | "custom")}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="local">
            <Trans>Local</Trans>
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Trans>Custom</Trans>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="local">
          <STTViewLocal {...sttProps} />
        </TabsContent>
        <TabsContent value="custom">
          <STTViewRemote />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const initialSttModels: STTModel[] = [
  {
    key: "QuantizedTiny",
    name: "Whisper Tiny (Multilingual)",
    size: "44 MB",
    downloaded: true,
    fileName: "ggml-tiny-q8_0.bin",
  },
  {
    key: "QuantizedTinyEn",
    name: "WhisperTiny (English)",
    size: "44 MB",
    downloaded: false,
    fileName: "ggml-tiny.en-q8_0.bin",
  },
  {
    key: "QuantizedBase",
    name: "Whisper Base (Multilingual)",
    size: "82 MB",
    downloaded: false,
    fileName: "ggml-base-q8_0.bin",
  },
  {
    key: "QuantizedBaseEn",
    name: "WhisperBase (English)",
    size: "82 MB",
    downloaded: false,
    fileName: "ggml-base.en-q8_0.bin",
  },
  {
    key: "QuantizedSmall",
    name: "Whisper Small (Multilingual)",
    size: "264 MB",
    downloaded: false,
    fileName: "ggml-small-q8_0.bin",
  },
  {
    key: "QuantizedSmallEn",
    name: "WhisperSmall (English)",
    size: "264 MB",
    downloaded: false,
    fileName: "ggml-small.en-q8_0.bin",
  },
  {
    key: "QuantizedLargeTurbo",
    name: "WhisperLarge (Multilingual)",
    size: "874 MB",
    downloaded: false,
    fileName: "ggml-large-v3-turbo-q8_0.bin",
  },
];
