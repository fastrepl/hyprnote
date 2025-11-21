import type { FileUIPart, TextUIPart } from "ai";
import {
  FullscreenIcon,
  MicIcon,
  PaperclipIcon,
  SendIcon,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { TiptapEditor } from "@hypr/tiptap/editor";
import Editor from "@hypr/tiptap/editor";
import {
  EMPTY_TIPTAP_DOC,
  type PlaceholderFunction,
} from "@hypr/tiptap/shared";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import type { HyprUIMessage } from "../../chat/types";
import { useShell } from "../../contexts/shell";
import { useCurrentModelModalitySupport } from "../../hooks/useCurrentModelModalitySupport";
import { ATTACHMENT_SIZE_LIMIT } from "../../shared/attachments/constants";
import {
  type PersistedChatAttachment,
  removeChatAttachment,
  saveChatAttachment,
} from "./attachments/storage";

type MessagePart = TextUIPart | FileUIPart | HyprUIMessage["parts"][number];

export function ChatMessageInput({
  onSendMessage,
  disabled: disabledProp,
  chatGroupId,
}: {
  onSendMessage: (
    content: string,
    parts: MessagePart[],
    attachments: Array<{
      file: File;
      persisted?: PersistedChatAttachment;
    }>,
  ) => Promise<void> | void;
  disabled?: boolean | { disabled: boolean; message?: string };
  chatGroupId?: string;
}) {
  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ file: File; persisted?: PersistedChatAttachment }>
  >([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const modalitySupport = useCurrentModelModalitySupport();

  const hasImageAttachments = attachedFiles.some((item) =>
    isImageFile(item.file),
  );
  const capabilityWarning =
    hasImageAttachments && modalitySupport && !modalitySupport.includes("image")
      ? "This model does not support images. These attachments will be ignored."
      : null;

  const disabled =
    typeof disabledProp === "object" ? disabledProp.disabled : disabledProp;

  const handleSubmit = useCallback(async () => {
    const json = editorRef.current?.editor?.getJSON();
    const text = tiptapJsonToText(json).trim();

    if (disabled) {
      return;
    }

    const filteredFiles = attachedFiles.filter((item) => {
      if (!modalitySupport) {
        return true;
      }

      const isImage = isImageFile(item.file);

      if (isImage && !modalitySupport.includes("image")) {
        return false;
      }

      return true;
    });

    if (!text && filteredFiles.length === 0) {
      return;
    }

    const fileParts: MessagePart[] = filteredFiles.map((item) => {
      if (item.persisted) {
        return {
          type: "data-chat-file",
          data: {
            type: "chat-file",
            attachmentId: item.persisted.id,
            filename: item.persisted.fileName,
            mediaType: item.persisted.mimeType,
            size: item.persisted.size,
            fileUrl: item.persisted.fileUrl,
          },
        };
      }

      return {
        type: "file",
        filename: item.file.name,
        mediaType: item.file.type,
        url: URL.createObjectURL(item.file),
      } satisfies FileUIPart;
    });

    const parts: MessagePart[] = [
      ...(text ? [{ type: "text" as const, text }] : []),
      ...fileParts,
    ];

    const attachmentsForMessage = filteredFiles.map(({ file, persisted }) => ({
      file,
      persisted,
    }));

    try {
      await onSendMessage(text, parts, attachmentsForMessage);
    } catch (error) {
      console.error("[chat] failed to send message", error);
      const message =
        error instanceof Error ? error.message : "Failed to send message";
      setAttachmentError(message);
      return;
    }

    editorRef.current?.editor?.commands.clearContent();
    setAttachedFiles([]);
    setAttachmentError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [attachedFiles, disabled, modalitySupport, onSendMessage]);

  useEffect(() => {
    const editor = editorRef.current?.editor;
    if (!editor || editor.isDestroyed || !editor.isInitialized) {
      return;
    }

    if (!disabled) {
      editor.commands.focus();
    }
  }, [disabled]);

  const handleAttachFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        const validFiles: Array<{
          file: File;
          persisted?: PersistedChatAttachment;
        }> = [];
        let errorMessage: string | null = null;

        for (const file of Array.from(files)) {
          if (file.size > ATTACHMENT_SIZE_LIMIT) {
            errorMessage = `File "${file.name}" exceeds ${Math.round(ATTACHMENT_SIZE_LIMIT / 1024 / 1024)}MB limit`;
            break;
          }

          if (chatGroupId) {
            try {
              const persisted = await saveChatAttachment(chatGroupId, file);
              validFiles.push({ file, persisted });
            } catch (error) {
              errorMessage =
                error instanceof Error ? error.message : String(error);
              break;
            }
          } else {
            validFiles.push({ file });
          }
        }

        if (errorMessage) {
          setAttachmentError(errorMessage);
        } else {
          setAttachmentError(null);
          setAttachedFiles((prev) => [...prev, ...validFiles]);
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [chatGroupId],
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      setAttachedFiles((prev) => {
        const toRemove = prev[index];
        if (toRemove?.persisted && chatGroupId) {
          void removeChatAttachment(chatGroupId, toRemove.persisted.id).catch(
            (error) => {
              console.error("[chat] failed to remove attachment", error);
            },
          );
        }
        return prev.filter((_, i) => i !== index);
      });
      setAttachmentError(null);
    },
    [chatGroupId],
  );

  const handleTakeScreenshot = useCallback(() => {
    console.log("Take screenshot clicked");
  }, []);

  const handleVoiceInput = useCallback(() => {
    console.log("Voice input clicked");
  }, []);

  return (
    <Container>
      <div className="flex flex-col p-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 p-2 bg-neutral-50 rounded-md">
              {attachedFiles.map((item, index) => (
                <div
                  key={`${item.file.name}-${index}`}
                  className="flex items-center gap-2 px-2 py-1 bg-white border border-neutral-200 rounded text-xs"
                >
                  <span className="truncate max-w-[150px]">
                    {item.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            {attachmentError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                {attachmentError}
              </div>
            )}
            {capabilityWarning && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {capabilityWarning}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 mb-2">
          <Editor
            ref={editorRef}
            editable={!disabled}
            initialContent={EMPTY_TIPTAP_DOC}
            placeholderComponent={ChatPlaceholder}
            mentionConfig={{
              trigger: "@",
              handleSearch: async () => [
                { id: "123", type: "human", label: "John Doe" },
              ],
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              onClick={handleAttachFile}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn(["h-8 w-8", disabled && "text-neutral-400"])}
            >
              <PaperclipIcon size={16} />
            </Button>
            <Button
              onClick={handleTakeScreenshot}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn(["h-8 w-8", disabled && "text-neutral-400"])}
            >
              <FullscreenIcon size={16} />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              onClick={handleVoiceInput}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn(["h-8 w-8", disabled && "text-neutral-400"])}
            >
              <MicIcon size={16} />
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={disabled}
              size="icon"
              variant="ghost"
              className={cn(["h-8 w-8", disabled && "text-neutral-400"])}
            >
              <SendIcon size={16} />
            </Button>
          </div>
        </div>
      </div>
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  const { chat } = useShell();

  return (
    <div className={cn([chat.mode !== "RightPanelOpen" && "p-1"])}>
      <div
        className={cn([
          "flex flex-col border border-neutral-200 rounded-xl",
          chat.mode === "RightPanelOpen" && "rounded-t-none border-t-0",
        ])}
      >
        {children}
      </div>
    </div>
  );
}

const ChatPlaceholder: PlaceholderFunction = ({ node, pos }) => {
  if (node.type.name === "paragraph" && pos === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Ask & search about anything, or be creative!
      </p>
    );
  }
  return "";
};

function tiptapJsonToText(json: any): string {
  if (!json || typeof json !== "object") {
    return "";
  }

  if (json.type === "text") {
    return json.text || "";
  }

  if (json.type === "mention") {
    return `@${json.attrs?.label || json.attrs?.id || ""}`;
  }

  if (json.content && Array.isArray(json.content)) {
    return json.content.map(tiptapJsonToText).join("");
  }

  return "";
}

function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith("image/")) {
    return true;
  }
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(file.name);
}
