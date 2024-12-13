import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";
import * as Tabs from "@radix-ui/react-tabs";
import * as Form from "@radix-ui/react-form";

interface SettingsModalProps {
  onTrigger?: () => void;
}

interface LicenseInfo {
  type: "Free" | "Starter Pack" | "For Life";
  price: string;
  features: string[];
  duration: string;
  buttonText: string;
}

export default function SettingsModal({ onTrigger }: SettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [showMeetingIndicator, setShowMeetingIndicator] = useState(true);
  const [openOnLogin, setOpenOnLogin] = useState(true);
  const [theme, setTheme] = useState("system");
  const [jargons, setJargons] = useState("");
  const [googleCalendar, setGoogleCalendar] = useState(false);
  const [iCalCalendar, setICalCalendar] = useState(false);
  const [scheduledMeetings, setScheduledMeetings] = useState(true);
  const [autoDetectedMeetings, setAutoDetectedMeetings] = useState(true);
  const [feedbackType, setFeedbackType] = useState<
    "feedback" | "problem" | "question"
  >("feedback");
  const [feedbackText, setFeedbackText] = useState("");

  useEffect(() => {
    const handleSettingsTrigger = () => {
      setIsOpen(true);
    };

    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("openSettings", handleSettingsTrigger);
    window.addEventListener("keydown", handleKeyboardShortcut);
    
    return () => {
      window.removeEventListener("openSettings", handleSettingsTrigger);
      window.removeEventListener("keydown", handleKeyboardShortcut);
    };
  }, []);

  const licenses: LicenseInfo[] = [
    {
      type: "Free",
      price: "무료",
      duration: "2주 무료 체험",
      features: ["기본 기능 사용", "초대 시 1주일 연장 (최대 3회)"],
      buttonText: "현재 플랜",
    },
    {
      type: "Starter Pack",
      price: "$10",
      duration: "1개월",
      features: ["모든 기본 기능", "무제한 사용"],
      buttonText: "업그레이드",
    },
    {
      type: "For Life",
      price: "$149",
      duration: "평생 사용",
      features: ["모든 기능 평생 사용", "1년간 무료 업데이트"],
      buttonText: "업그레이드",
    },
  ];

  const handleFeedbackSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    console.log("Feedback submitted:", {
      type: feedbackType,
      text: feedbackText,
    });
    setFeedbackText("");
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-overlayShow fixed inset-0 bg-black/25" />
        <Dialog.Content className="data-[state=open]:animate-contentShow fixed left-[50%] top-[50%] h-[80vh] w-[80vw] max-w-[1200px] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-[6px] bg-white shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none">
          <div className="flex h-full flex-col">
            <Dialog.Title className="m-0 border-b border-gray-200 p-6 text-[17px] font-medium">
              설정
            </Dialog.Title>

            <div className="flex-1 overflow-y-auto">
              <Tabs.Root defaultValue="general" className="h-full">
                <div className="flex h-full">
                  <Tabs.List className="flex w-48 flex-none flex-col border-r border-gray-200">
                    <Tabs.Trigger
                      value="general"
                      className="px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 data-[state=active]:border-r-2 data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-500"
                    >
                      일반
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value="calendar"
                      className="px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 data-[state=active]:border-r-2 data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-500"
                    >
                      캘린더
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value="notifications"
                      className="px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 data-[state=active]:border-r-2 data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-500"
                    >
                      알림
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value="slack"
                      className="px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 data-[state=active]:border-r-2 data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-500"
                    >
                      Slack
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value="license"
                      className="px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 data-[state=active]:border-r-2 data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-500"
                    >
                      라이센스
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value="feedback"
                      className="px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 data-[state=active]:border-r-2 data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-500"
                    >
                      피드백
                    </Tabs.Trigger>
                  </Tabs.List>

                  <div className="flex-1 overflow-y-auto p-6">
                    <Tabs.Content value="general" className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            이름
                          </label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">
                            실시간 미팅 표시
                          </label>
                          <Switch.Root
                            checked={showMeetingIndicator}
                            onCheckedChange={setShowMeetingIndicator}
                            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
                          >
                            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
                          </Switch.Root>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">
                            로그인시 자동 실행
                          </label>
                          <Switch.Root
                            checked={openOnLogin}
                            onCheckedChange={setOpenOnLogin}
                            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
                          >
                            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
                          </Switch.Root>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            테마
                          </label>
                          <Select.Root value={theme} onValueChange={setTheme}>
                            <Select.Trigger className="mt-1 inline-flex w-full justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                              <Select.Value />
                              <Select.Icon>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke-width="1.5"
                                  stroke="currentColor"
                                  className="size-4"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                                  />
                                </svg>
                              </Select.Icon>
                            </Select.Trigger>
                            <Select.Portal>
                              <Select.Content className="overflow-hidden rounded-md bg-white shadow-lg">
                                <Select.Viewport className="p-1">
                                  <Select.Item
                                    value="system"
                                    className="relative flex h-8 select-none items-center rounded px-6 text-sm text-gray-900 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900"
                                  >
                                    <Select.ItemText>시스템</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="light"
                                    className="relative flex h-8 select-none items-center rounded px-6 text-sm text-gray-900 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900"
                                  >
                                    <Select.ItemText>라이트</Select.ItemText>
                                  </Select.Item>
                                  <Select.Item
                                    value="dark"
                                    className="relative flex h-8 select-none items-center rounded px-6 text-sm text-gray-900 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900"
                                  >
                                    <Select.ItemText>다크</Select.ItemText>
                                  </Select.Item>
                                </Select.Viewport>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            자주 쓰는 용어
                          </label>
                          <textarea
                            value={jargons}
                            onChange={(e) => setJargons(e.target.value)}
                            rows={4}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            placeholder="자주 쓰는 용어를 입력하세요"
                          />
                        </div>
                      </div>
                    </Tabs.Content>

                    <Tabs.Content value="calendar" className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">
                            Google 캘린더
                          </label>
                          <Switch.Root
                            checked={googleCalendar}
                            onCheckedChange={setGoogleCalendar}
                            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
                          >
                            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
                          </Switch.Root>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">
                            iCal 캘린더
                          </label>
                          <Switch.Root
                            checked={iCalCalendar}
                            onCheckedChange={setICalCalendar}
                            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
                          >
                            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
                          </Switch.Root>
                        </div>
                      </div>
                    </Tabs.Content>

                    <Tabs.Content value="notifications" className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">
                            예약된 미팅
                          </label>
                          <Switch.Root
                            checked={scheduledMeetings}
                            onCheckedChange={setScheduledMeetings}
                            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
                          >
                            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
                          </Switch.Root>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">
                            자동 감지된 미팅
                          </label>
                          <Switch.Root
                            checked={autoDetectedMeetings}
                            onCheckedChange={setAutoDetectedMeetings}
                            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-blue-500"
                          >
                            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px]" />
                          </Switch.Root>
                        </div>
                      </div>
                    </Tabs.Content>

                    <Tabs.Content value="slack" className="space-y-6">
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            /* TODO: Implement Slack connection */
                          }}
                          className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          Slack 연동하기
                        </button>
                      </div>
                    </Tabs.Content>

                    <Tabs.Content value="license" className="space-y-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {licenses.map((license) => (
                          <div
                            key={license.type}
                            className="rounded-lg border p-6 shadow-sm transition-shadow hover:shadow-md"
                          >
                            <h3 className="text-lg font-medium">
                              {license.type}
                            </h3>
                            <p className="mt-2 text-2xl font-bold">
                              {license.price}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              {license.duration}
                            </p>
                            <ul className="mt-4 space-y-2">
                              {license.features.map((feature, index) => (
                                <li
                                  key={index}
                                  className="flex items-center text-sm"
                                >
                                  <span className="mr-2">•</span>
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            <button className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                              {license.buttonText}
                            </button>
                          </div>
                        ))}
                      </div>
                    </Tabs.Content>

                    <Tabs.Content value="feedback" className="space-y-6">
                      <Form.Root onSubmit={handleFeedbackSubmit}>
                        <div className="space-y-4">
                          <div className="flex space-x-4">
                            <button
                              type="button"
                              onClick={() => setFeedbackType("feedback")}
                              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${
                                feedbackType === "feedback"
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              피드백
                            </button>
                            <button
                              type="button"
                              onClick={() => setFeedbackType("problem")}
                              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${
                                feedbackType === "problem"
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              문제점
                            </button>
                            <button
                              type="button"
                              onClick={() => setFeedbackType("question")}
                              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${
                                feedbackType === "question"
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              문의사항
                            </button>
                          </div>

                          <div>
                            <textarea
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              rows={4}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              placeholder="의견을 입력해주세요"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                              제출하기
                            </button>
                          </div>
                        </div>
                      </Form.Root>
                    </Tabs.Content>
                  </div>
                </div>
              </Tabs.Root>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
