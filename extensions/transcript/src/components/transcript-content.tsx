import { Badge } from "@hypr/ui/components/ui/badge";
import { useTranscript } from "../hooks/useTranscript";

interface TranscriptContentProps {
  sessionId: string;
  showLiveBadge: boolean;
}

export function TranscriptContent({ sessionId, showLiveBadge }: TranscriptContentProps) {
  const { isLive } = useTranscript(sessionId);
  
  return showLiveBadge && isLive ? (
    <Badge
      variant="destructive"
      className="hover:bg-destructive"
    >
      LIVE
    </Badge>
  ) : null;
}
