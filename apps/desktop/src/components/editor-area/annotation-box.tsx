// apps/desktop/src/components/editor-area/annotation-box.tsx
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { useHypr } from "@/contexts";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { toast } from "@hypr/ui/components/ui/toast";
import { modelProvider, smoothStream, streamText, tool } from "@hypr/utils/ai";

interface AnnotationBoxProps {
  selectedText: string;
  selectedRect: DOMRect;
  sessionId: string;
  onCancel: () => void;
}

export function AnnotationBox({ selectedText, selectedRect, sessionId, onCancel }: AnnotationBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [streamedContent, setStreamedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const { onboardingSessionId } = useHypr();

  // Store abort controller reference
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const llmConnectionQuery = useQuery({
    queryKey: ["llm-connection"],
    queryFn: () => connectorCommands.getLlmConnection(),
    refetchOnWindowFocus: true,
  });

  const sourceAnalysisMutation = useMutation({
    mutationFn: async () => {
      setIsStreaming(true);
      setStreamedContent("");

      // Create NEW abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const getWordsFunc = sessionId === onboardingSessionId ? dbCommands.getWordsOnboarding : dbCommands.getWords;
      const [{ type }, words] = await Promise.all([
        connectorCommands.getLlmConnection(),
        getWordsFunc(sessionId),
      ]);

      const freshIsLocalLlm = type === "HyprLocal";

      // Create transcript text from words
      const transcriptText = words.map(word => word.text).join(" ");

      const systemMessage =
        `You are an assistant that helps users understand where content in their notes came from in the original transcript.

            Your task:
            1. Look at the provided transcript
            2. Find where the selected text would have been derived from
            3. Quote the specific section from the transcript that relates to the selected text. If it doesn't exist, say so. 
            4. Provide a simple explanation (max 3 sentences)

            Format your response as:
            **Source Section:**
            "[exact quote from transcript (only if it exists)]"

            **Explanation:**
            [Your brief explanation of how this content relates to the selected text]`;

      const userMessage = `Selected text from notes: "${selectedText}"

        Full transcript:
        ${transcriptText}

        Please find the source section in the transcript that this selected text was derived from and explain the connection.`;

      // CRITICAL: Create abort signal that combines controller + timeout
      const abortSignal = AbortSignal.any([
        abortController.signal,
        AbortSignal.timeout(60000),
      ]);

      const provider = await modelProvider();
      const model = sessionId === onboardingSessionId
        ? provider.languageModel("onboardingModel")
        : provider.languageModel("defaultModel");

      // CRITICAL: Pass abortSignal to streamText
      const { fullStream } = streamText({
        abortSignal, // ← This makes cancellation actually work!
        model,
        ...(freshIsLocalLlm && {
          tools: {
            update_progress: tool({ inputSchema: z.any() }),
          },
        }),
        onError: (error) => {
          toast({
            id: "source-analysis-error",
            title: "🚨 Failed to analyze source",
            content: "Please try again or contact the team.",
            dismissible: true,
            duration: 5000,
          });
          throw error;
        },
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        experimental_transform: [
          smoothStream({ delayInMs: 40, chunking: "word" }),
        ],
      });

      let acc = "";

      for await (const chunk of fullStream) {
        if (chunk.type === "text-delta") {
          acc += chunk.text;
          setStreamedContent(acc);
        }
        if (chunk.type === "error") {
          throw new Error(String(chunk.error));
        }
      }

      return acc;
    },
    onSuccess: () => {
      setIsStreaming(false);
      abortControllerRef.current = null; // Clear reference
    },
    onError: (error) => {
      console.error("Source analysis error:", error);
      setIsStreaming(false);
      abortControllerRef.current = null; // Clear reference

      // Check if it was cancelled (not a real error)
      const wasCancelled = (error instanceof DOMException && error.name === "AbortError")
        || (typeof error === "object" && error !== null && "name" in error && (error as any).name === "AbortError")
        || String(error).includes("aborted");

      if (!wasCancelled) {
        setStreamedContent("Failed to analyze source. Please try again.");
      }
    },
  });

  // Start analysis when component mounts
  useEffect(() => {
    if (llmConnectionQuery.data) {
      sourceAnalysisMutation.mutate();
    }
  }, [llmConnectionQuery.data]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
        }
        onCancel();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
        }
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onCancel]);

  const getPosition = () => {
    const popoverWidth = 400; // Keep wider width
    const maxPopoverHeight = 200; // Restore original height
    const margin = 20;
    const minDistanceFromText = 15;

    // Calculate available space above and below the selected text
    const spaceAbove = selectedRect.top - margin;
    const spaceBelow = window.innerHeight - selectedRect.bottom - margin;

    // Determine if we have enough space above or below for maximum possible height
    const canFitAbove = spaceAbove >= (maxPopoverHeight + minDistanceFromText);
    const canFitBelow = spaceBelow >= (maxPopoverHeight + minDistanceFromText);

    let top: number;

    if (canFitBelow) {
      // Prefer below if there's space for max height
      top = selectedRect.bottom + minDistanceFromText;
    } else if (canFitAbove) {
      // Use above if below doesn't work but above does
      top = selectedRect.top - maxPopoverHeight - minDistanceFromText;
    } else {
      // Neither fits perfectly - choose the side with more space
      if (spaceBelow >= spaceAbove) {
        // More space below - position to fit in available space
        top = Math.max(
          selectedRect.bottom + minDistanceFromText,
          window.innerHeight - Math.min(maxPopoverHeight, spaceBelow) - margin,
        );
      } else {
        // More space above - position to fit in available space
        top = Math.min(
          selectedRect.top - minDistanceFromText - maxPopoverHeight,
          margin,
        );
      }
    }

    // Horizontal positioning
    let left = selectedRect.left + (selectedRect.width / 2) - (popoverWidth / 2);

    // Adjust if going off the right edge
    if (left + popoverWidth > window.innerWidth - margin) {
      left = window.innerWidth - popoverWidth - margin;
    }

    // Ensure it doesn't go off the left edge
    if (left < margin) {
      left = margin;
    }

    return { left, top };
  };

  const position = getPosition();

  // Cancel function
  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleCloseClick = () => {
    cancelGeneration(); // Cancel any ongoing generation

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    onCancel();
  };

  return (
    <div
      ref={boxRef}
      className="fixed z-[9999] bg-white border border-neutral-200 rounded-lg shadow-lg transition-all duration-200 ease-out overflow-hidden"
      style={{
        left: position.left,
        top: position.top,
        width: "400px",
        height: "200px", // Fixed height instead of maxHeight
      }}
    >
      <div className="p-4 h-full flex flex-col">
        {/* Header with close button */}
        <div className="flex items-start justify-between mb-3 flex-shrink-0">
          <div className="text-sm text-neutral-700 font-medium">
            Source Analysis
          </div>
          <button
            onClick={handleCloseClick}
            className="text-neutral-400 hover:text-neutral-600 transition-colors -mt-0.5 -mr-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Streaming content - takes remaining space */}
        <div className="flex-1 overflow-hidden">
          {isStreaming && !streamedContent
            ? (
              <div className="flex items-center gap-2 text-neutral-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs">Analyzing transcript...</span>
              </div>
            )
            : (
              <div className="text-xs text-neutral-700 leading-relaxed h-full overflow-y-auto">
                {streamedContent
                  ? (
                    <div
                      className="prose prose-xs max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: streamedContent
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\n/g, "<br>"),
                      }}
                    />
                  )
                  : (
                    <div className="text-neutral-400 italic">
                      Waiting for analysis...
                    </div>
                  )}
                {isStreaming && <span className="inline-block w-2 h-3 bg-neutral-400 animate-pulse ml-1" />}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
