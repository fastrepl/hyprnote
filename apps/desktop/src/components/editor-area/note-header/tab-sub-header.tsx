import { useSession } from "@hypr/utils/contexts";
import { type TranscriptEditorRef } from "@hypr/tiptap/transcript";
import { EnhancedNoteSubHeader } from "./sub-headers/enhanced-note-sub-header";
import { TranscriptSubHeader } from "./sub-headers/transcript-sub-header";

interface TabSubHeaderProps {
  sessionId: string;
  onEnhance?: (params: { triggerType: "manual" | "template"; templateId?: string | null }) => void;
  isEnhancing?: boolean;
  transcriptEditorRef?: TranscriptEditorRef | null;
  progress?: number;
  showProgress?: boolean;
  hashtags?: string[];
}

export function TabSubHeader({ sessionId, onEnhance, isEnhancing, transcriptEditorRef, progress, showProgress, hashtags }: TabSubHeaderProps) {
  const activeTab = useSession(sessionId, (s) => s.activeTab);

  // Conditionally render based on activeTab
  if (activeTab === 'enhanced') {
    return <EnhancedNoteSubHeader sessionId={sessionId} onEnhance={onEnhance} isEnhancing={isEnhancing} progress={progress} showProgress={showProgress} />;
  }
  
  if (activeTab === 'transcript') {
    return <TranscriptSubHeader sessionId={sessionId} editorRef={{ current: transcriptEditorRef || null }} />;
  }
  
  if (activeTab === 'raw') {
    // Empty sub-header with same dimensions as enhanced tab for consistent layout
    return <div className="flex items-center justify-end px-8 py-2"></div>;
  }
  
  return null;
}
