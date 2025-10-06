import { useQuery } from "@tanstack/react-query";
import { openPath } from "@tauri-apps/plugin-opener";
import { arch, platform } from "@tauri-apps/plugin-os";
import { DownloadIcon, FolderIcon, InfoIcon } from "lucide-react";
import { useEffect, useMemo } from "react";

import { useHypr } from "@/contexts";
import { useLicense } from "@/hooks/use-license";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as localSttCommands, ServerHealth, type SupportedSttModel } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import { SharedSTTProps, STTModel } from "./shared";

const DEFAULT_MODEL_KEYS = ["QuantizedSmall"];
const OTHER_MODEL_KEYS = [
  "QuantizedTiny",
  "QuantizedTinyEn",
  "QuantizedBase",
  "QuantizedBaseEn",
  "QuantizedSmallEn",
  "QuantizedLargeTurbo",
];

const REFETCH_INTERVALS = {
  servers: 1000,
  downloadStatus: 3000,
} as const;

interface STTViewProps extends SharedSTTProps {
  isWerModalOpen: boolean;
  setIsWerModalOpen: (open: boolean) => void;
  provider: "Local" | "Custom";
  setProviderToLocal: () => void;
}

interface ModelSectionProps {
  status?: ServerHealth;
  modelsToShow: STTModel[];
  selectedSTTModel: string;
  setSelectedSTTModel: (model: string) => void;
  downloadingModels: Set<string>;
  handleModelDownload: (model: string) => void;
  provider: "Local" | "Custom";
  setProviderToLocal: () => void;
  userId?: string;
}

export function STTViewLocal({
  selectedSTTModel,
  setSelectedSTTModel,
  sttModels,
  setSttModels,
  downloadingModels,
  handleModelDownload,
  provider,
  setProviderToLocal,
}: STTViewProps) {
  const { userId } = useHypr();
  const amAvailable = useMemo(() => platform() === "macos" && arch() === "aarch64", []);

  const servers = useQuery({
    queryKey: ["local-stt-servers"],
    queryFn: async () => localSttCommands.getServers(),
    refetchInterval: REFETCH_INTERVALS.servers,
  });

  const currentSTTModel = useQuery({
    queryKey: ["current-stt-model"],
    queryFn: () => localSttCommands.getLocalModel(),
  });

  const sttModelDownloadStatus = useQuery({
    queryKey: ["stt-model-download-status"],
    queryFn: async () => {
      const models = [
        "QuantizedTiny",
        "QuantizedTinyEn",
        "QuantizedBase",
        "QuantizedBaseEn",
        "QuantizedSmall",
        "QuantizedSmallEn",
        "QuantizedLargeTurbo",
        "am-parakeet-v2",
        "am-parakeet-v3",
      ] satisfies SupportedSttModel[];

      const statusChecks = await Promise.all(
        models.map(model => localSttCommands.isModelDownloaded(model)),
      );

      return models.reduce((acc, model, index) => ({
        ...acc,
        [model]: statusChecks[index],
      }), {} as Record<SupportedSttModel, boolean>);
    },
    refetchInterval: REFETCH_INTERVALS.downloadStatus,
  });

  // ----------------------------------------
  // Effects
  // ----------------------------------------
  useEffect(() => {
    if (currentSTTModel.data) {
      setSelectedSTTModel(currentSTTModel.data);
    }
  }, [currentSTTModel.data, setSelectedSTTModel]);

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

  // ----------------------------------------
  // Model Filtering
  // ----------------------------------------
  const modelsToShow = useMemo(() =>
    sttModels.filter(model =>
      DEFAULT_MODEL_KEYS.includes(model.key)
      || (OTHER_MODEL_KEYS.includes(model.key) && model.downloaded)
    ), [sttModels]);

  // ----------------------------------------
  // Render
  // ----------------------------------------
  return (
    <div className="space-y-8">
      {/* Basic Models Section */}
      <BasicModelsSection
        status={servers.data?.internal}
        modelsToShow={modelsToShow}
        selectedSTTModel={selectedSTTModel}
        setSelectedSTTModel={setSelectedSTTModel}
        downloadingModels={downloadingModels}
        handleModelDownload={handleModelDownload}
        provider={provider}
        setProviderToLocal={setProviderToLocal}
        userId={userId}
      />

      {/* Divider - only show if pro models available */}
      {amAvailable && (
        <>
          <hr className="border-gray-200" />

          {/* Pro Models Section */}
          <ProModelsSection
            status={servers.data?.external}
            selectedSTTModel={selectedSTTModel}
            setSelectedSTTModel={setSelectedSTTModel}
            downloadingModels={downloadingModels}
            handleModelDownload={handleModelDownload}
            provider={provider}
            setProviderToLocal={setProviderToLocal}
            userId={userId}
          />
        </>
      )}
    </div>
  );
}

// ============================================
// BASIC MODELS SECTION
// ============================================
function BasicModelsSection({
  status,
  modelsToShow,
  selectedSTTModel,
  setSelectedSTTModel,
  downloadingModels,
  handleModelDownload,
  provider,
  setProviderToLocal,
  userId,
}: ModelSectionProps) {
  const handleShowFileLocation = async () => {
    const path = await localSttCommands.modelsDir();
    openPath(path);
  };

  return (
    <section className="max-w-2xl">
      {/* Section Header */}
      <SectionHeader
        title="Basic Models"
        description="Default inference mode powered by Whisper.cpp."
        status={status}
        docsUrl="https://docs.hyprnote.com/models"
      />

      {/* Models List */}
      <div className="space-y-2 mt-4">
        {modelsToShow.map((model) => (
          <ModelEntry
            key={model.key}
            model={model}
            selectedSTTModel={selectedSTTModel}
            setSelectedSTTModel={setSelectedSTTModel}
            downloadingModels={downloadingModels}
            handleModelDownload={handleModelDownload}
            handleShowFileLocation={handleShowFileLocation}
            provider={provider}
            setProviderToLocal={setProviderToLocal}
            userId={userId}
          />
        ))}
      </div>
    </section>
  );
}

// ============================================
// PRO MODELS SECTION
// ============================================
function ProModelsSection({
  status,
  selectedSTTModel,
  setSelectedSTTModel,
  downloadingModels,
  handleModelDownload,
  provider,
  setProviderToLocal,
  userId,
}: Omit<ModelSectionProps, "modelsToShow">) {
  const { getLicense } = useLicense();

  const handleShowFileLocation = async () => {
    const path = await localSttCommands.modelsDir();
    openPath(path);
  };

  const proModels = useQuery({
    queryKey: ["pro-models"],
    queryFn: async () => {
      const models = await localSttCommands.listSupportedModels().then((models) =>
        models.filter((model) => ["am-parakeet-v2", "am-parakeet-v3"].includes(model.key))
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
    refetchInterval: REFETCH_INTERVALS.downloadStatus,
  });

  return (
    <section className="max-w-2xl">
      <SectionHeader
        title="Pro Models"
        description="Resource and latency optimized. Only for pro users."
        status={status}
        docsUrl="https://docs.hyprnote.com/models"
      />

      {/* Models List */}
      <div className="space-y-2 mt-4">
        {proModels.data?.map((model) => (
          <ModelEntry
            key={model.key}
            disabled={!getLicense.data?.valid}
            model={model}
            selectedSTTModel={selectedSTTModel}
            setSelectedSTTModel={setSelectedSTTModel}
            downloadingModels={downloadingModels}
            handleModelDownload={handleModelDownload}
            handleShowFileLocation={handleShowFileLocation}
            provider={provider}
            setProviderToLocal={setProviderToLocal}
            userId={userId}
          />
        ))}
      </div>
    </section>
  );
}

// ============================================
// SHARED COMPONENTS
// ============================================
function SectionHeader({
  title,
  subtitle,
  description,
  status,
  docsUrl,
}: {
  title: string;
  subtitle?: string;
  description: string;
  status?: ServerHealth;
  docsUrl?: string;
}) {
  const handleClick = () => {
    localSttCommands.stopServer(null).then(() => localSttCommands.startServer(null));
  };

  return (
    <header className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-gray-700">
          {title}
          {subtitle && <span className="font-normal text-gray-500 ml-1">{subtitle}</span>}
        </h3>
        <span
          onClick={handleClick}
          className={cn(
            "w-2 h-2 rounded-full",
            (status === "ready")
              ? "bg-blue-300 animate-pulse"
              : (status === "loading")
              ? "bg-yellow-300"
              : "bg-gray-100",
          )}
        />
        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
            title="View documentation"
          >
            <InfoIcon className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </header>
  );
}

function ModelEntry({
  model,
  selectedSTTModel,
  setSelectedSTTModel,
  downloadingModels,
  handleModelDownload,
  handleShowFileLocation,
  provider,
  setProviderToLocal,
  disabled = false,
  userId,
}: {
  model: STTModel;
  selectedSTTModel: string;
  setSelectedSTTModel: (model: string) => void;
  downloadingModels: Set<string>;
  handleModelDownload: (model: string) => void;
  handleShowFileLocation: () => void;
  provider: "Local" | "Custom";
  setProviderToLocal: () => void;
  disabled?: boolean;
  userId?: string;
}) {
  // only highlight if provider is Local and this is the selected model
  const isSelected = provider === "Local" && selectedSTTModel === model.key && model.downloaded;
  const isSelectable = model.downloaded && !disabled;
  const isDownloading = downloadingModels.has(model.key);

  const handleClick = async () => {
    if (isSelectable) {
      setSelectedSTTModel(model.key as SupportedSttModel);
      await localSttCommands.setLocalModel(model.key as SupportedSttModel);
      setProviderToLocal();
      await localSttCommands.stopServer(null);
      await localSttCommands.startServer(null);

      if (userId) {
        const isProModel = model.key.startsWith("am-");
        const sttType = isProModel ? "local-pro" : "local-basic";

        await analyticsCommands.setProperties({
          distinct_id: userId,
          set: {
            stt: sttType,
          },
        });
      }
    }
  };

  const getCardStyles = () => {
    if (isSelected) {
      return "border-solid border-blue-500 bg-blue-50";
    }
    if (isSelectable) {
      return "border-dashed border-gray-300 hover:border-gray-400 bg-white";
    }
    return "border-dashed border-gray-200 bg-gray-50 cursor-not-allowed";
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border-2 transition-all cursor-pointer",
        "flex items-center justify-between",
        getCardStyles(),
      )}
      onClick={handleClick}
    >
      {/* Model Info */}
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

      {/* Action Buttons */}
      <div className="flex items-center">
        {model.downloaded
          ? (
            <Button
              size="sm"
              disabled={disabled}
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleShowFileLocation();
              }}
              className="text-xs h-7 px-2 flex items-center gap-1"
            >
              <FolderIcon className="w-3 h-3" />
              Show in Finder
            </Button>
          )
          : isDownloading
          ? (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="text-xs h-7 px-2 text-blue-600 border-blue-200"
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
