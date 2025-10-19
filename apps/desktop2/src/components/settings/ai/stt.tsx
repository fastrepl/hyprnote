import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { useQuery } from "../../../hooks/useQuery";

export function STT() {
  const parakeet2 = useQuery({
    queryFn: () => localSttCommands.isModelDownloaded("am-parakeet-v2"),
    refetchInterval: 1500,
  });

  const parakeet3 = useQuery({
    queryFn: () => localSttCommands.isModelDownloaded("am-parakeet-v3"),
    refetchInterval: 1500,
  });

  return (
    <div className="space-y-8">
    </div>
  );
}
