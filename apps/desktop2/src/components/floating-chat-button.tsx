import { MessageCircle, SendIcon } from "lucide-react";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { commands as windowsCommands } from "@hypr/plugin-windows/v1";
import { cn } from "@hypr/ui/lib/utils";
import * as persisted from "../store/tinybase/persisted";
import { id } from "../utils";

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  useHotkeys("esc", () => setIsOpen(false));

  const handleAddMessage = persisted.UI.useSetRowCallback(
    "chat_messages",
    id(),
    (row: persisted.ChatMessage) => ({
      ...row,
      metadata: JSON.stringify(row.metadata),
      parts: JSON.stringify(row.parts),
    } satisfies persisted.ChatMessage),
    [],
    persisted.STORE_ID,
  );

  return (
    <>
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-40",
            "w-[440px] h-[600px] max-h-[calc(100vh-120px)]",
            "bg-white rounded-2xl shadow-2xl",
            "border border-neutral-200",
            "flex flex-col",
            "animate-in slide-in-from-bottom-4 fade-in duration-200",
          )}
        >
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-neutral-700" />
              <h3 className="font-semibold text-neutral-900">Ask Hyprnote anything</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => windowsCommands.windowShow({ type: "chat", value: id() })}
                className="text-neutral-400 hover:text-neutral-600 text-xl leading-none"
              >
                !
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-12 h-12 text-neutral-300 mb-3" />
              <p className="text-neutral-600 text-sm mb-2">
                Ask the AI assistant about anything.
              </p>
              <p className="text-neutral-400 text-xs">
                It can also do few cool stuff for you.
              </p>
            </div>
          </div>

          <form
            className="p-4 border-t border-neutral-200 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleAddMessage({
                user_id: id(),
                chat_group_id: id(),
                content: "Hello, world!",
                created_at: new Date().toISOString(),
                role: "user",
                parts: [{ type: "text", text: "Hello, world!" }],
                metadata: {},
              });
            }}
          >
            <input
              type="text"
              placeholder="Ask & search about anything, or be creative!"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="text-neutral-500 hover:text-neutral-700 transition-colors flex-shrink-0"
            >
              <SendIcon className="size-4" />
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-4 right-4 z-50",
            "w-14 h-14 rounded-full",
            "bg-white shadow-lg hover:shadow-xl",
            "border border-neutral-200",
            "flex items-center justify-center",
            "transition-all duration-200",
            "hover:scale-105",
            isOpen && "scale-95",
          )}
        >
          <img
            src="/assets/dynamic.gif"
            alt="Chat Assistant"
            className="w-12 h-12 object-contain"
          />
        </button>
      )}
    </>
  );
}
