import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useHypr } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";
import { showSttModelDownloadToast } from "../../toast/shared";
import { SharedSTTProps, STTModel } from "../components/ai/shared";
import { STTViewLocal } from "../components/ai/stt-view-local";
import { STTViewRemote } from "../components/ai/stt-view-remote";

export default function SttAI() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"default" | "custom">("default");
  const { userId } = useHypr();
  const providerQuery = useQuery({
    queryKey: ["stt-provider"],
    queryFn: () => localSttCommands.getProvider(),
  });

  const setProviderMutation = useMutation({
    mutationFn: (provider: "Local" | "Custom") => {
      if (provider === "Custom") {
        localSttCommands.stopServer(null);
      }
      return localSttCommands.setProvider(provider);
    },
    onSuccess: () => {
      providerQuery.refetch();
    },
    onError: (error) => {
      console.error("Failed to set provider:", error);
    },
  });

  const provider = providerQuery.data ?? "Local";

  useEffect(() => {
    if (provider === "Custom") {
      setActiveTab("custom");
    } else {
      setActiveTab("default");
    }
  }, [provider]);

  const setProviderToLocal = () => setProviderMutation.mutate("Local");
  const setProviderToCustom = async () => {
    setProviderMutation.mutate("Custom");

    if (userId) {
      await analyticsCommands.setProperties({
        distinct_id: userId,
        set: {
          stt: "custom",
        },
      });
    }
  };

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
      localSttCommands.setLocalModel(modelKey as any);
      setProviderToLocal();
    }, queryClient);
  };

  const sttProps: SharedSTTProps & {
    isWerModalOpen: boolean;
    setIsWerModalOpen: (open: boolean) => void;
    provider: "Local" | "Custom";
    setProviderToLocal: () => void;
  } = {
    selectedSTTModel,
    setSelectedSTTModel,
    sttModels,
    setSttModels,
    downloadingModels,
    handleModelDownload,
    isWerModalOpen,
    setIsWerModalOpen,
    provider,
    setProviderToLocal,
  };

  return (
    <div className="space-y-8">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "default" | "custom")}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="default">
            <Trans>Default</Trans>
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Trans>Custom</Trans>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="default">
          <STTViewLocal {...sttProps} />
        </TabsContent>
        <TabsContent value="custom">
          <STTViewRemote provider={provider} setProviderToCustom={setProviderToCustom} />
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
