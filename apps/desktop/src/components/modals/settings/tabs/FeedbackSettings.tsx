import * as Form from "@radix-ui/react-form";

interface FeedbackSettingsProps {
  feedbackType: "feedback" | "problem" | "question";
  setFeedbackType: (value: "feedback" | "problem" | "question") => void;
  feedbackText: string;
  setFeedbackText: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function FeedbackSettings({
  feedbackType,
  setFeedbackType,
  feedbackText,
  setFeedbackText,
  onSubmit,
}: FeedbackSettingsProps) {
  return (
    <Form.Root className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          피드백 유형
        </label>
        <div className="mt-2 space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={feedbackType === "feedback"}
              onChange={() => setFeedbackType("feedback")}
              className="h-4 w-4 border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">일반 피드백</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={feedbackType === "problem"}
              onChange={() => setFeedbackType("problem")}
              className="h-4 w-4 border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">문제 제보</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              checked={feedbackType === "question"}
              onChange={() => setFeedbackType("question")}
              className="h-4 w-4 border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">문의사항</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          피드백 내용
        </label>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          제출하기
        </button>
      </div>
    </Form.Root>
  );
}
