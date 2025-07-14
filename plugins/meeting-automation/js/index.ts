export * from "./bindings.gen";

export interface MeetingAutomationEvents {
  recording_auto_started: MeetingDetectionEvent;
  recording_auto_stopped: MeetingDetectionEvent;
  meeting_notification: {
    title: string;
    message: string;
    actions: Array<[string, string]>;
  };
}

export interface MeetingDetectionEvent {
  event_type: MeetingEventType;
  app_bundle_id: string;
  app_name: string;
  timestamp: string;
  metadata: Record<string, string>;
}

export enum MeetingEventType {
  AppLaunched = "AppLaunched",
  AppTerminated = "AppTerminated",
  MicActivityDetected = "MicActivityDetected",
  MicActivityStopped = "MicActivityStopped",
  ScheduledMeetingStarting = "ScheduledMeetingStarting",
  ScheduledMeetingEnding = "ScheduledMeetingEnding",
  WindowFocused = "WindowFocused",
  WindowUnfocused = "WindowUnfocused",
}

export interface AutomationConfig {
  enabled: boolean;
  auto_start_on_app_detection: boolean;
  auto_start_on_mic_activity: boolean;
  auto_stop_on_app_exit: boolean;
  auto_start_scheduled_meetings: boolean;
  require_window_focus: boolean;
  pre_meeting_notification_minutes: number;
  supported_apps: string[];
  notification_settings: NotificationSettings;
}

export interface NotificationSettings {
  show_meeting_started: boolean;
  show_meeting_ending: boolean;
  show_pre_meeting_reminder: boolean;
  show_recording_started: boolean;
  show_recording_stopped: boolean;
}
