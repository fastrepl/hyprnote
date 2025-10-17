import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { useQuery } from "../../../hooks/useQuery";
import { ModelCard, ProviderCard, Section } from "./shared";

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
      <Section title="On-device models" description="Local transcription models">
        <ModelCard
          name="Parakeet-2"
          description="For English-only conversations"
          status={JSON.stringify(parakeet2.data)}
        />
        <ModelCard
          name="Parakeet-3"
          description="For European languages"
          status={JSON.stringify(parakeet3.data)}
        />
      </Section>

      <Section title="Speech-to-text providers" description="Cloud-based transcription services">
        <ProviderCard name="Deepgram" />
        <ProviderCard name="Assembly AI" configured />
      </Section>
    </div>
  );
}
