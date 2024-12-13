import { useState } from "react";

interface SidePanelProps {
  noteContent: string;
}

export default function SidePanel({ noteContent }: SidePanelProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ text: string; isUser: boolean }>
  >([]);

  const quickActions = [
    { label: "질의응답 사항 정리", action: "SUMMARIZE_QA" },
    { label: "액션 아이템 나열", action: "LIST_ACTIONS" },
    { label: "회의록 요약", action: "SUMMARIZE_MEETING" },
    { label: "팔로우업 이메일 작성", action: "WRITE_EMAIL" },
    { label: "다음 회의 안건 제안", action: "SUGGEST_AGENDA" },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) return;

    // 사용자 메시지 추가
    setMessages((prev) => [...prev, { text: message, isUser: true }]);

    // AI 응답 처리
    try {
      // TODO: AI 응답 API 호출
      const aiResponse = "임시 AI 응답입니다."; // API 응답으로 대체 필요
      setMessages((prev) => [...prev, { text: aiResponse, isUser: false }]);
    } catch (error) {
      console.error("AI 응답 처리 중 오류:", error);
    }

    setMessage("");
  };

  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 72)}px`; // 최대 3줄 (24px * 3)
  };

  return (
    <div className="flex h-full flex-col border-l border-gray-200 bg-white p-4">
      {messages.length === 0 && (
        <div className="flex h-full flex-1 flex-col items-center justify-center space-y-4">
          <div className="space-y-1 text-center">
            <p className="text-gray-600">AI 어시스턴트에게 물어보세요</p>
            <p className="text-sm text-gray-500">
              회의 내용을 분석하고 정리하는데 도움을 드립니다
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {quickActions.map((action) => (
              <button
                key={action.action}
                onClick={() => {
                  /* AI 처리 로직 */
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
        <div className="mb-4 flex-1 space-y-4 overflow-y-auto bg-red-200">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`rounded-lg p-3 ${
                msg.isUser ? "ml-8 bg-blue-50" : "mr-8 bg-gray-50"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            adjustTextareaHeight(e);
          }}
          placeholder="노트에 대해 질문하세요..."
          className="max-h-[72px] min-h-[40px] w-full resize-none overflow-y-auto rounded-lg border p-3"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          onClick={handleSubmit}
          className="flex h-[40px] w-[40px] items-center justify-center rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
