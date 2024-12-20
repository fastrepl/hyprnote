import { useState } from "react";
import { sendChatMessage } from "../../api/noteApi";
import { useTranslation } from "react-i18next";

interface ChatPanelProps {
  transcript: string;
}

export default function ChatPanel({ transcript }: ChatPanelProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ text: string; isUser: boolean }>
  >([]);

  const quickActions = [
    { label: t("note.chat.quickActions.summarizeQA"), action: "SUMMARIZE_QA" },
    { label: t("note.chat.quickActions.listActions"), action: "LIST_ACTIONS" },
    { label: t("note.chat.quickActions.summarizeMeeting"), action: "SUMMARIZE_MEETING" },
    { label: t("note.chat.quickActions.writeEmail"), action: "WRITE_EMAIL" },
    { label: t("note.chat.quickActions.suggestAgenda"), action: "SUGGEST_AGENDA" },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setMessages((prev) => [...prev, { text: message, isUser: true }]);
    setMessage("");

    try {
      const response = await sendChatMessage(message, transcript);
      setMessages((prev) => [...prev, { text: response.text, isUser: false }]);
    } catch (error) {
      console.error("Error processing AI response:", error);
      setMessages((prev) => [
        ...prev,
        { text: t("note.chat.error"), isUser: false },
      ]);
    }
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 72)}px`;
  };

  return (
    <div className="flex h-full flex-col">
      {messages.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-4">
          <div className="space-y-1 text-center">
            <p className="text-gray-600">{t("note.chat.placeholder")}</p>
            <p className="text-sm text-gray-500">
              {t("note.chat.description")}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {quickActions.map((action) => (
              <button
                key={action.action}
                onClick={async () => {
                  setMessages((prev) => [
                    ...prev,
                    { text: action.label, isUser: true },
                  ]);

                  try {
                    const response = await sendChatMessage(
                      action.label,
                      transcript,
                    );
                    setMessages((prev) => [
                      ...prev,
                      { text: response.text, isUser: false },
                    ]);
                  } catch (error) {
                    console.error("Error processing AI response:", error);
                    setMessages((prev) => [
                      ...prev,
                      {
                        text: t("note.chat.error"),
                        isUser: false,
                      },
                    ]);
                  }
                }}
                className="whitespace-nowrap rounded-lg border px-1.5 py-1 text-xs hover:bg-gray-50"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-4 whitespace-pre-wrap break-all rounded-lg p-3 ${
                msg.isUser ? "ml-8 bg-blue-50" : "mr-8 bg-gray-50"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 border-t p-4">
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            adjustTextareaHeight(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={t("note.chat.placeholder")}
          className="flex-1 resize-none rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ height: "40px", maxHeight: "72px" }}
        />
        <button
          onClick={handleSubmit}
          disabled={!message.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {t("note.chat.send")}
        </button>
      </div>
    </div>
  );
}
