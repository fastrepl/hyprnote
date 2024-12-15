import { useState } from "react";
import * as Form from "@radix-ui/react-form";

export function Feedback() {
  const [feedbackType, setFeedbackType] = useState<
    "feedback" | "problem" | "question"
  >("feedback");
  const [feedbackText, setFeedbackText] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // TODO: Implement feedback submission logic
    console.log({ feedbackType, feedbackText });
  };

  return (
    <Form.Root className="space-y-4" onSubmit={handleSubmit}>
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
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="피드백 내용을 입력하세요"
        />
      </div>

      <Form.Submit asChild>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          제출하기
        </button>
      </Form.Submit>
    </Form.Root>
  );
}
