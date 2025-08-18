import { useQuery } from "@tanstack/react-query";
import { openPath } from "@tauri-apps/plugin-opener";
import { arch, platform } from "@tauri-apps/plugin-os";
import { DownloadIcon, FolderIcon } from "lucide-react";
import { useEffect, useMemo } from "react";

import { commands as localSttCommands, SupportedSttModel, type WhisperModel } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import { SharedSTTProps, STTModel } from "./shared";

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
        localSttCommands.isModelDownloaded("am-parakeet-v2"),
        localSttCommands.isModelDownloaded("am-whisper-large-v3"),
      ]);
      return {
        "QuantizedTiny": statusChecks[0],
        "QuantizedTinyEn": statusChecks[1],
        "QuantizedBase": statusChecks[2],
        "QuantizedBaseEn": statusChecks[3],
        "QuantizedSmall": statusChecks[4],
        "QuantizedSmallEn": statusChecks[5],
        "QuantizedLargeTurbo": statusChecks[6],
      } as Record<SupportedSttModel, boolean>;
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (sttModelDownloadStatus.data) {
      setSttModels(prev =>
        prev.map(model => ({
          ...model,
          downloaded: sttModelDownloadStatus.data[model.key as SupportedSttModel] || false,
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
          selectedSTTModel={selectedSTTModel}
          setSelectedSTTModel={setSelectedSTTModel}
          downloadingModels={downloadingModels}
          handleModelDownload={handleModelDownload}
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
          <span className={cn(["w-2 h-2 rounded-full", on ? "bg-blue-300 animate-pulse" : "bg-gray-100"])} />
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

function ProModelsManagement(
  { on, selectedSTTModel, setSelectedSTTModel, downloadingModels, handleModelDownload }: {
    on: boolean;
    selectedSTTModel: string;
    setSelectedSTTModel: (model: string) => void;
    downloadingModels: Set<string>;
    handleModelDownload: (model: string) => void;
  },
) {
  // const { getLicense } = useLicense();
  const handleShowFileLocation = async () => {
    localSttCommands.modelsDir().then((path) => openPath(path));
  };

  const proModels = useQuery({
    queryKey: ["pro-models"],
    queryFn: async () => {
      const models = await localSttCommands.listSupportedModels().then((models) =>
        models.filter((model) =>
          model.key === "am-whisper-large-v3" || model.key === "am-parakeet-v2" || model.key === "am-parakeet-v3"
        )
      );
      const downloaded = await Promise.all(
        models.map(({ key }) => localSttCommands.isModelDownloaded(key)),
      );

      return models.map((model, index) => ({
        name: model.display_name,
        key: model.key,
        downloaded: downloaded[index],
        size: `${(model.size_bytes / 1024 / 1024).toFixed(0)} MB`,
        fileName: "",
      }));
    },
    refetchInterval: 3000,
  });

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <div className="flex flex-col mb-3">
          <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <h3>Pro Models (Available soon)</h3>
            <span className={cn(["w-2 h-2 rounded-full", on ? "bg-blue-300 animate-pulse" : "bg-gray-100"])} />
          </div>
          <p className="text-xs text-gray-500">
            Latency and resource optimized. Only for pro plan users.
          </p>
        </div>

        <div className="space-y-2">
          {proModels.data?.map((model) => (
            <ModelEntry
              key={model.key}
              disabled={true}
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
          : (model.downloaded && !disabled)
          ? "border-dashed border-gray-300 hover:border-gray-400 bg-white"
          : "border-dashed border-gray-200 bg-gray-50 cursor-not-allowed",
      )}
      onClick={() => {
        if (model.downloaded && !disabled) {
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
              disabled={disabled}
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
