import { useSession } from "@hypr/utils/contexts";
import { EnhancedNoteSubHeader } from "./sub-headers/enhanced-note-sub-header";

interface TabSubHeaderProps {
  sessionId: string;
  onEnhance?: (params: { triggerType: "manual" | "template"; templateId?: string | null }) => void;
  isEnhancing?: boolean;
}

export function TabSubHeader({ sessionId, onEnhance, isEnhancing }: TabSubHeaderProps) {
  const activeTab = useSession(sessionId, (s) => s.activeTab);

  // Conditionally render based on activeTab
  if (activeTab === 'enhanced') {
    return <EnhancedNoteSubHeader sessionId={sessionId} onEnhance={onEnhance} isEnhancing={isEnhancing} />;
  }
  
  if (activeTab === 'raw' || activeTab === 'transcript') {
    // Empty sub-header with same dimensions as enhanced tab for consistent layout
    return <div className="flex items-center justify-end px-8 py-2"></div>;
  }
  
  return null;
}
