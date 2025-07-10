import { invoke } from "@tauri-apps/api/core";
import React, { useEffect, useState } from "react";

interface AutoRecordingSettings {
  autoRecordingEnabled: boolean;
  autoRecordOnScheduled: boolean;
  autoRecordOnAdHoc: boolean;
  notifyBeforeMeeting: boolean;
  requireWindowFocus: boolean;
  minutesBeforeNotification: number;
}

interface MeetingDetected {
  app: {
    name: string;
    bundle_id: string;
    window_patterns: string[];
  };
  window_title?: string;
  detected_at: string;
  confidence: number;
}

export const AutoRecordingSettings: React.FC = () => {
  const [settings, setSettings] = useState<AutoRecordingSettings>({
    autoRecordingEnabled: false,
    autoRecordOnScheduled: true,
    autoRecordOnAdHoc: true,
    notifyBeforeMeeting: true,
    requireWindowFocus: false,
    minutesBeforeNotification: 5,
  });

  const [activeMeetings, setActiveMeetings] = useState<MeetingDetected[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    loadActiveMeetings();
    const interval = setInterval(loadActiveMeetings, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    try {
      const [
        autoRecordingEnabled,
        autoRecordOnScheduled,
        autoRecordOnAdHoc,
        notifyBeforeMeeting,
        requireWindowFocus,
        minutesBeforeNotification,
      ] = await Promise.all([
        invoke<boolean>("plugin:auto-recording|get_auto_recording_enabled"),
        invoke<boolean>("plugin:auto-recording|get_auto_record_on_scheduled"),
        invoke<boolean>("plugin:auto-recording|get_auto_record_on_ad_hoc"),
        invoke<boolean>("plugin:auto-recording|get_notify_before_meeting"),
        invoke<boolean>("plugin:auto-recording|get_require_window_focus"),
        invoke<number>("plugin:auto-recording|get_minutes_before_notification"),
      ]);

      setSettings({
        autoRecordingEnabled,
        autoRecordOnScheduled,
        autoRecordOnAdHoc,
        notifyBeforeMeeting,
        requireWindowFocus,
        minutesBeforeNotification,
      });
    } catch (error) {
      console.error("Failed to load auto-recording settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveMeetings = async () => {
    try {
      const meetings = await invoke<MeetingDetected[]>("plugin:auto-recording|get_active_meetings");
      setActiveMeetings(meetings);
    } catch (error) {
      console.error("Failed to load active meetings:", error);
    }
  };

  const updateSetting = async <K extends keyof AutoRecordingSettings>(
    key: K,
    value: AutoRecordingSettings[K],
  ) => {
    try {
      const commandMap = {
        autoRecordingEnabled: "set_auto_recording_enabled",
        autoRecordOnScheduled: "set_auto_record_on_scheduled",
        autoRecordOnAdHoc: "set_auto_record_on_ad_hoc",
        notifyBeforeMeeting: "set_notify_before_meeting",
        requireWindowFocus: "set_require_window_focus",
        minutesBeforeNotification: "set_minutes_before_notification",
      };

      await invoke(`plugin:auto-recording|${commandMap[key]}`, {
        [key === "minutesBeforeNotification" ? "minutes" : "enabled"]: value,
      });

      setSettings(prev => ({ ...prev, [key]: value }));

      if (key === "autoRecordingEnabled") {
        if (value) {
          await invoke("plugin:auto-recording|start_auto_recording_monitor");
        } else {
          await invoke("plugin:auto-recording|stop_auto_recording_monitor");
        }
      }
    } catch (error) {
      console.error(`Failed to update ${key}:`, error);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading auto-recording settings...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Auto-Recording Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Automatically start recording when meetings begin
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white">
              Enable Auto-Recording
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Master switch for automatic meeting recording
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.autoRecordingEnabled}
              onChange={(e) => updateSetting("autoRecordingEnabled", e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
            </div>
          </label>
        </div>

        {settings.autoRecordingEnabled && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Record Scheduled Meetings
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Automatically record calendar meetings when they start
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.autoRecordOnScheduled}
                  onChange={(e) => updateSetting("autoRecordOnScheduled", e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Record Ad-Hoc Meetings
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Automatically record when meeting apps are detected
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.autoRecordOnAdHoc}
                  onChange={(e) => updateSetting("autoRecordOnAdHoc", e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Show Notifications
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Get notified before meetings start and when recording begins
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.notifyBeforeMeeting}
                  onChange={(e) => updateSetting("notifyBeforeMeeting", e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Require Window Focus
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Only record when the meeting app window is visible and focused
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.requireWindowFocus}
                  onChange={(e) => updateSetting("requireWindowFocus", e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                </div>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Notification Time
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                How many minutes before a scheduled meeting to show notification
              </p>
              <select
                value={settings.minutesBeforeNotification}
                onChange={(e) => updateSetting("minutesBeforeNotification", parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value={1}>1 minute</option>
                <option value={2}>2 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
              </select>
            </div>
          </>
        )}
      </div>

      {activeMeetings.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Active Meetings
          </h3>
          <div className="space-y-2">
            {activeMeetings.map((meeting, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
              >
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {meeting.app.name}
                  </p>
                  {meeting.window_title && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {meeting.window_title}
                    </p>
                  )}
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Detected at {new Date(meeting.detected_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Recording
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Supported Meeting Apps
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {[
            "Zoom",
            "Google Meet",
            "Microsoft Teams",
            "Slack",
            "Discord",
            "FaceTime",
            "Webex",
          ].map((app) => (
            <div
              key={app}
              className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md"
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-xs text-gray-700 dark:text-gray-300">{app}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
