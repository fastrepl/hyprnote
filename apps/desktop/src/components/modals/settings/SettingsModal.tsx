import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { GeneralSettings } from "./tabs/GeneralSettings";
import { FeedbackSettings } from "./tabs/FeedbackSettings";
import { LicenseSettings } from "./tabs/LicenseSettings";
import { CalendarSettings } from "./tabs/CalendarSettings";
import { NotificationSettings } from "./tabs/NotificationSettings";
import { SlackSettings } from "./tabs/SlackSettings";
import { SettingsTabs } from "./tabs/SettingsTabs";

interface SettingsModalProps {
  onTrigger?: () => void;
  initialTab?:
    | "general"
    | "feedback"
    | "license"
    | "calendar"
    | "notification"
    | "slack";
  type?: "invite" | "settings" | "feedback";
  onClose?: () => void;
}

interface LicenseInfo {
  type: "Free" | "Starter Pack" | "For Life";
  price: string;
  features: string[];
  duration: string;
  buttonText: string;
}

export default function SettingsModal({
  onTrigger,
  type = "settings",
  onClose,
}: SettingsModalProps) {
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

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (type === "feedback") return "feedback";
    if (type === "invite") return "license";
    return "general";
  });

  useEffect(() => {
    if (type === "feedback") setActiveTab("feedback");
    else if (type === "invite") setActiveTab("license");
    else setActiveTab("general");
  }, [type]);

  useEffect(() => {
    const handleSettingsTrigger = () => {
      setIsOpen(true);
      setActiveTab("general");
    };

    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      if (e.key === "," && (e.metaKey || e.ctrlKey)) {
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
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open && onClose) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-overlayShow fixed inset-0 bg-black/25" />
        <Dialog.Content className="data-[state=open]:animate-contentShow fixed left-[50%] top-[50%] h-[80vh] w-[80vw] max-w-[1200px] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-[6px] bg-gray-50 shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none">
          <div className="flex h-full flex-col">
            <Dialog.Title className="m-0 border-b border-gray-200 p-6 text-[17px] font-medium">
              {type === "feedback"
                ? "피드백 보내기"
                : type === "invite"
                  ? "초대하기"
                  : "설정"}
            </Dialog.Title>

            <div className="flex-1 overflow-y-auto">
              <Tabs.Root defaultValue={activeTab} className="h-full">
                <div className="flex h-full">
                  <SettingsTabs />

                  <div className="h-full flex-1 overflow-y-auto p-6">
                    <Tabs.Content value="general">
                      <GeneralSettings
                        fullName={fullName}
                        setFullName={setFullName}
                        showMeetingIndicator={showMeetingIndicator}
                        setShowMeetingIndicator={setShowMeetingIndicator}
                        openOnLogin={openOnLogin}
                        setOpenOnLogin={setOpenOnLogin}
                        theme={theme}
                        setTheme={setTheme}
                        jargons={jargons}
                        setJargons={setJargons}
                      />
                    </Tabs.Content>

                    <Tabs.Content value="calendar">
                      <CalendarSettings
                        googleCalendar={googleCalendar}
                        setGoogleCalendar={setGoogleCalendar}
                        iCalCalendar={iCalCalendar}
                        setICalCalendar={setICalCalendar}
                      />
                    </Tabs.Content>

                    <Tabs.Content value="notifications">
                      <NotificationSettings
                        scheduledMeetings={scheduledMeetings}
                        setScheduledMeetings={setScheduledMeetings}
                        autoDetectedMeetings={autoDetectedMeetings}
                        setAutoDetectedMeetings={setAutoDetectedMeetings}
                      />
                    </Tabs.Content>

                    <Tabs.Content value="slack" className="h-full">
                      <SlackSettings />
                    </Tabs.Content>

                    <Tabs.Content value="license">
                      <LicenseSettings licenses={licenses} />
                    </Tabs.Content>

                    <Tabs.Content value="feedback">
                      <FeedbackSettings
                        feedbackType={feedbackType}
                        setFeedbackType={setFeedbackType}
                        feedbackText={feedbackText}
                        setFeedbackText={setFeedbackText}
                        onSubmit={handleFeedbackSubmit}
                      />
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
