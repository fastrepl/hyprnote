import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { openPath } from "@tauri-apps/plugin-opener";
import { useState } from "react";

import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import { showSttModelDownloadToast } from "../../toast/shared";
import { SharedSTTProps, STTModel } from "../components/ai/shared";
import { STTViewLocal } from "../components/ai/stt-view-local";
import { STTViewRemote } from "../components/ai/stt-view-remote";

export default function SttAI() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"local" | "remote">("local");

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

  const handleShowFileLocation = async (modelType: "stt" | "llm") => {
    const path = await localSttCommands.modelsDir();
    await openPath(path);
  };

  const sttProps: SharedSTTProps & { isWerModalOpen: boolean; setIsWerModalOpen: (open: boolean) => void } = {
    selectedSTTModel,
    setSelectedSTTModel,
    sttModels,
    setSttModels,
    downloadingModels,
    handleModelDownload,
    handleShowFileLocation,
    isWerModalOpen,
    setIsWerModalOpen,
  };

  return (
    <div className="space-y-8">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "local" | "remote")}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="local">
            <Trans>Local</Trans>
          </TabsTrigger>
          <TabsTrigger value="remote">
            <Trans>Remote</Trans>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="local">
          <STTViewLocal {...sttProps} />
        </TabsContent>
        <TabsContent value="remote">
          <STTViewRemote />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const initialSttModels: STTModel[] = [
  {
    key: "QuantizedTiny",
    name: "Tiny",
    accuracy: 1,
    speed: 3,
    size: "44 MB",
    downloaded: true,
    fileName: "ggml-tiny-q8_0.bin",
  },
  {
    key: "QuantizedTinyEn",
    name: "Tiny - English",
    accuracy: 1,
    speed: 3,
    size: "44 MB",
    downloaded: false,
    fileName: "ggml-tiny.en-q8_0.bin",
  },
  {
    key: "QuantizedBase",
    name: "Base",
    accuracy: 2,
    speed: 2,
    size: "82 MB",
    downloaded: false,
    fileName: "ggml-base-q8_0.bin",
  },
  {
    key: "QuantizedBaseEn",
    name: "Base - English",
    accuracy: 2,
    speed: 2,
    size: "82 MB",
    downloaded: false,
    fileName: "ggml-base.en-q8_0.bin",
  },
  {
    key: "QuantizedSmall",
    name: "Small",
    accuracy: 2,
    speed: 2,
    size: "264 MB",
    downloaded: false,
    fileName: "ggml-small-q8_0.bin",
  },
  {
    key: "QuantizedSmallEn",
    name: "Small - English",
    accuracy: 2,
    speed: 2,
    size: "264 MB",
    downloaded: false,
    fileName: "ggml-small.en-q8_0.bin",
  },
  {
    key: "QuantizedLargeTurbo",
    name: "Large",
    accuracy: 3,
    speed: 1,
    size: "874 MB",
    downloaded: false,
    fileName: "ggml-large-v3-turbo-q8_0.bin",
  },
];
