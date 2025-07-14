export * from "./bindings.gen";

export interface MeetingAutomationEvents {
  recording_auto_started: {
    app_name: string;
    session_id: string;
    timestamp: string;
  };
  recording_auto_stopped: {
    timestamp: string;
  };
  meeting_notification: {
    title: string;
    message: string;
    timestamp: string;
  };
}
