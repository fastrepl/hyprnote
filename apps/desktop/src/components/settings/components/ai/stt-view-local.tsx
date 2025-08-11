import { useQuery } from "@tanstack/react-query";
import { openPath } from "@tauri-apps/plugin-opener";
import { arch, platform } from "@tauri-apps/plugin-os";
import { DownloadIcon, FolderIcon } from "lucide-react";
import { useEffect, useMemo } from "react";

import { commands as localSttCommands, type WhisperModel } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import { SharedSTTProps, STTModel } from "./shared";

export const sttModelMetadata: Record<WhisperModel, {
  name: string;
  description: string;
  intelligence: number;
  speed: number;
  size: string;
  inputType: string[];
  outputType: string[];
  languageSupport: "multilingual" | "english-only";
  huggingface?: string;
}> = {
  "QuantizedTiny": {
    name: "Tiny",
    description: "Fastest, lowest accuracy. Good for offline, low-resource use.",
    intelligence: 1,
    speed: 3,
    size: "44 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "multilingual",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-tiny-q8_0.bin",
  },
  "QuantizedTinyEn": {
    name: "Tiny - English",
    description: "Fastest, English-only. Optimized for speed on English audio.",
    intelligence: 1,
    speed: 3,
    size: "44 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "english-only",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-tiny.en-q8_0.bin",
  },
  "QuantizedBase": {
    name: "Base",
    description: "Good balance of speed and accuracy for multilingual use.",
    intelligence: 2,
    speed: 2,
    size: "82 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "multilingual",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-base-q8_0.bin",
  },
  "QuantizedBaseEn": {
    name: "Base - English",
    description: "Balanced speed and accuracy, optimized for English audio.",
    intelligence: 2,
    speed: 2,
    size: "82 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "english-only",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-base.en-q8_0.bin",
  },
  "QuantizedSmall": {
    name: "Small",
    description: "Higher accuracy, moderate speed for multilingual transcription.",
    intelligence: 2,
    speed: 2,
    size: "264 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "multilingual",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-small-q8_0.bin",
  },
  "QuantizedSmallEn": {
    name: "Small - English",
    description: "Higher accuracy, moderate speed, optimized for English audio.",
    intelligence: 3,
    speed: 2,
    size: "264 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "english-only",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-small.en-q8_0.bin",
  },
  "QuantizedLargeTurbo": {
    name: "Large",
    description: "Highest accuracy, resource intensive. Only for Mac Pro M4 and above.",
    intelligence: 3,
    speed: 1,
    size: "874 MB",
    inputType: ["audio"],
    outputType: ["text"],
    languageSupport: "multilingual",
    huggingface: "https://huggingface.co/ggerganov/whisper.cpp/blob/main/ggml-large-v3-turbo-q8_0.bin",
  },
};

interface STTViewProps extends SharedSTTProps {
  isWerModalOpen: boolean;
  setIsWerModalOpen: (open: boolean) => void;
}

export function STTViewLocal({
  selectedSTTModel,
  setSelectedSTTModel,
  sttModels,
  setSttModels,
  downloadingModels,
  handleModelDownload,
}: STTViewProps) {
  const servers = useQuery({
    queryKey: ["local-stt-servers"],
    queryFn: () => localSttCommands.getServers(),
    refetchInterval: 1000,
  });

  const currentSTTModel = useQuery({
    queryKey: ["current-stt-model"],
    queryFn: () => localSttCommands.getCurrentModel(),
  });

  useEffect(() => {
    if (currentSTTModel.data) {
      setSelectedSTTModel(currentSTTModel.data);
    }
  }, [currentSTTModel.data, setSelectedSTTModel]);

  const amAvailable = useMemo(() => platform() === "macos" && arch() === "aarch64", []);

  const sttModelDownloadStatus = useQuery({
    queryKey: ["stt-model-download-status"],
    queryFn: async () => {
      const statusChecks = await Promise.all([
        localSttCommands.isModelDownloaded("QuantizedTiny"),
        localSttCommands.isModelDownloaded("QuantizedTinyEn"),
        localSttCommands.isModelDownloaded("QuantizedBase"),
        localSttCommands.isModelDownloaded("QuantizedBaseEn"),
        localSttCommands.isModelDownloaded("QuantizedSmall"),
        localSttCommands.isModelDownloaded("QuantizedSmallEn"),
        localSttCommands.isModelDownloaded("QuantizedLargeTurbo"),
      ]);
      return {
        "QuantizedTiny": statusChecks[0],
        "QuantizedTinyEn": statusChecks[1],
        "QuantizedBase": statusChecks[2],
        "QuantizedBaseEn": statusChecks[3],
        "QuantizedSmall": statusChecks[4],
        "QuantizedSmallEn": statusChecks[5],
        "QuantizedLargeTurbo": statusChecks[6],
      } as Record<string, boolean>;
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (sttModelDownloadStatus.data) {
      setSttModels(prev =>
        prev.map(model => ({
          ...model,
          downloaded: sttModelDownloadStatus.data[model.key] || false,
        }))
      );
    }
  }, [sttModelDownloadStatus.data, setSttModels]);

  const defaultModelKeys = ["QuantizedSmall"];
  const otherModelKeys = [
    "QuantizedTiny",
    "QuantizedTinyEn",
    "QuantizedBase",
    "QuantizedBaseEn",
    "QuantizedSmallEn",
    "QuantizedLargeTurbo",
  ];

  const modelsToShow = sttModels.filter(model => {
    if (defaultModelKeys.includes(model.key)) {
      return true;
    }

    if (otherModelKeys.includes(model.key) && model.downloaded) {
      return true;
    }

    return false;
  });

  return (
    <div className="space-y-6">
      <BasicModelsManagement
        on={!!servers.data?.internal}
        modelsToShow={modelsToShow}
        selectedSTTModel={selectedSTTModel}
        setSelectedSTTModel={setSelectedSTTModel}
        downloadingModels={downloadingModels}
        handleModelDownload={handleModelDownload}
      />
      {amAvailable && (
        <ProModelsManagement
          on={!!servers.data?.external}
        />
      )}
    </div>
  );
}

function BasicModelsManagement({
  on,
  modelsToShow,
  selectedSTTModel,
  setSelectedSTTModel,
  downloadingModels,
  handleModelDownload,
}: {
  on: boolean;
  modelsToShow: STTModel[];
  selectedSTTModel: string;
  setSelectedSTTModel: (model: string) => void;
  downloadingModels: Set<string>;
  handleModelDownload: (model: string) => void;
}) {
  const handleShowFileLocation = async () => {
    localSttCommands.modelsDir().then((path) => openPath(path));
  };

  return (
    <div className="max-w-2xl">
      <div className="flex flex-col mb-3">
        <div className={cn(["text-sm font-semibold text-gray-700 flex items-center gap-2"])}>
          <h3>Basic Models</h3>
          <span className={cn(["w-2 h-2 rounded-full", on ? "bg-blue-300 animate-pulse" : "bg-red-300"])} />
        </div>
        <p className="text-xs text-gray-500">Default inference mode powered by Whisper.cpp.</p>
      </div>

      <div className="space-y-2">
        {modelsToShow.map((model) => (
          <ModelEntry
            key={model.key}
            model={model}
            selectedSTTModel={selectedSTTModel}
            setSelectedSTTModel={setSelectedSTTModel}
            downloadingModels={downloadingModels}
            handleModelDownload={handleModelDownload}
            handleShowFileLocation={handleShowFileLocation}
          />
        ))}
      </div>
    </div>
  );
}

function ProModelsManagement({ on }: { on: boolean }) {
  const proModels = useQuery({
    queryKey: ["pro-models"],
    queryFn: () => localSttCommands.listProModels(),
  });

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <div className="flex flex-col mb-3">
          <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <h3>Pro Models</h3>
            <span className={cn(["w-2 h-2 rounded-full", on ? "bg-blue-300 animate-pulse" : "bg-red-300"])} />
          </div>
          <p className="text-xs text-gray-500">
            Only for pro plan users. Latency and resource optimized. (will be shipped in next few days)
          </p>
        </div>

        <div className="space-y-2">
          {proModels.data?.map((model) => (
            <ModelEntry
              key={model.key}
              disabled={true}
              model={{
                name: model.name,
                key: model.key,
                downloaded: false,
                size: `${(model.size_bytes / 1024 / 1024).toFixed(0)} MB`,
                fileName: "",
              }}
              selectedSTTModel={""}
              setSelectedSTTModel={() => {}}
              downloadingModels={new Set()}
              handleModelDownload={() => {}}
              handleShowFileLocation={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModelEntry({
  model,
  selectedSTTModel,
  setSelectedSTTModel,
  downloadingModels,
  handleModelDownload,
  handleShowFileLocation,
  disabled,
}: {
  model: STTModel;
  selectedSTTModel: string;
  setSelectedSTTModel: (model: string) => void;
  downloadingModels: Set<string>;
  handleModelDownload: (model: string) => void;
  handleShowFileLocation: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      key={model.key}
      className={cn(
        "p-3 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-between",
        selectedSTTModel === model.key && model.downloaded
          ? "border-solid border-blue-500 bg-blue-50"
          : model.downloaded
          ? "border-dashed border-gray-300 hover:border-gray-400 bg-white"
          : "border-dashed border-gray-200 bg-gray-50 cursor-not-allowed",
      )}
      onClick={() => {
        if (model.downloaded) {
          setSelectedSTTModel(model.key as WhisperModel);
          localSttCommands.setCurrentModel(model.key as WhisperModel);
          localSttCommands.stopServer(null);
          localSttCommands.startServer(null);
        }
      }}
    >
      <div className="flex items-center gap-6 flex-1">
        <div className="min-w-0">
          <h3
            className={cn(
              "font-semibold text-base",
              model.downloaded ? "text-gray-900" : "text-gray-400",
            )}
          >
            {model.name}
          </h3>
        </div>
      </div>

      <div className="flex items-center">
        {model.downloaded
          ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleShowFileLocation}
              className="text-xs h-7 px-2 flex items-center gap-1"
            >
              <FolderIcon className="w-3 h-3" />
              Show in Finder
            </Button>
          )
          : downloadingModels.has(model.key)
          ? (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="text-xs h-7 px-2 flex items-center gap-1 text-blue-600 border-blue-200"
            >
              Downloading...
            </Button>
          )
          : (
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                handleModelDownload(model.key);
              }}
              className="text-xs h-7 px-2 flex items-center gap-1"
            >
              <DownloadIcon className="w-3 h-3" />
              {model.size}
            </Button>
          )}
      </div>
    </div>
  );
}
