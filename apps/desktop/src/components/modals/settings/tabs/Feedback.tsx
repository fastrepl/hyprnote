import { useState } from "react";
import * as Form from "@radix-ui/react-form";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useTranslation } from "react-i18next";

export function Feedback() {
  const { t } = useTranslation();
  const [feedbackType, setFeedbackType] = useState<
    "feedback" | "problem" | "question"
  >("feedback");
  const [feedbackText, setFeedbackText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle feedback submission
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">{t("settings.feedback.title")}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {t("settings.feedback.description")}
        </p>
      </div>

      <div className="h-px bg-gray-200" />

      <Form.Root className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("settings.feedback.type.label")}
          </label>
          <RadioGroup.Root
            className="mt-2 flex gap-4"
            value={feedbackType}
            onValueChange={(value: "feedback" | "problem" | "question") =>
              setFeedbackType(value)
            }
          >
            <div className="inline-flex items-center">
              <RadioGroup.Item
                value="feedback"
                id="feedback"
                className="h-4 w-4 rounded-full border border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <RadioGroup.Indicator className="relative flex h-full w-full items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-blue-500" />
              </RadioGroup.Item>
              <label className="ml-2 text-sm text-gray-700" htmlFor="feedback">
                {t("settings.feedback.type.general")}
              </label>
            </div>
            <div className="inline-flex items-center">
              <RadioGroup.Item
                value="problem"
                id="problem"
                className="h-4 w-4 rounded-full border border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <RadioGroup.Indicator className="relative flex h-full w-full items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-blue-500" />
              </RadioGroup.Item>
              <label className="ml-2 text-sm text-gray-700" htmlFor="problem">
                {t("settings.feedback.type.problem")}
              </label>
            </div>
            <div className="inline-flex items-center">
              <RadioGroup.Item
                value="question"
                id="question"
                className="h-4 w-4 rounded-full border border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <RadioGroup.Indicator className="relative flex h-full w-full items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-blue-500" />
              </RadioGroup.Item>
              <label className="ml-2 text-sm text-gray-700" htmlFor="question">
                {t("settings.feedback.type.question")}
              </label>
            </div>
          </RadioGroup.Root>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("settings.feedback.content.label")}
          </label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-2"
            placeholder={t("settings.feedback.content.placeholder")}
          />
        </div>

        <Form.Submit asChild>
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {t("settings.feedback.submit")}
          </button>
        </Form.Submit>
      </Form.Root>
    </div>
  );
}
