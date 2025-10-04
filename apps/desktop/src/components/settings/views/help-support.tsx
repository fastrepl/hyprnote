import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { Book, Bug, ExternalLinkIcon, MessageSquare } from "lucide-react";

import { commands as tracingCommands } from "@hypr/plugin-tracing";
import { useHypr } from "../../../contexts/hypr";

export default function HelpSupport() {
  const { userId } = useHypr();

  const handleOpenFeedback = () => {
    openUrl("https://hyprnote.canny.io/feature-requests");
  };

  const handleOpenDocs = () => {
    openUrl("https://docs.hyprnote.com");
  };

  const handleReportBug = () => {
    openUrl("https://hyprnote.canny.io/bug-report");
  };

  const handleOpenLogs = () => {
    tracingCommands.logsDir().then((logsDir) => {
      openPath(logsDir);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Help & Support
        </h2>

        <div className="space-y-3">
          {/* Documentation */}
          <button
            onClick={handleOpenDocs}
            className="w-full flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Book className="h-5 w-5 text-gray-600" />
              <div className="text-left">
                <div className="font-medium">
                  Documentation
                </div>
                <div className="text-sm text-gray-500">
                  Learn how to use Hyprnote
                </div>
              </div>
            </div>
            <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
          </button>

          {/* Feature Requests / Feedback */}
          <button
            onClick={handleOpenFeedback}
            className="w-full flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-gray-600" />
              <div className="text-left">
                <div className="font-medium">
                  Feature Requests
                </div>
                <div className="text-sm text-gray-500">
                  Suggest new features and improvements
                </div>
              </div>
            </div>
            <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
          </button>

          {/* Bug Reports */}
          <button
            onClick={handleReportBug}
            className="w-full flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bug className="h-5 w-5 text-gray-600" />
              <div className="text-left">
                <div className="font-medium">
                  Report a Bug
                </div>
                <div className="text-sm text-gray-500">
                  Help us improve by reporting issues
                </div>
              </div>
            </div>
            <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
          </button>

          {/* Logs */}
          <button
            onClick={handleOpenLogs}
            className="w-full flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bug className="h-5 w-5 text-gray-600" />
              <div className="text-left">
                <div className="font-medium">
                  Logs
                </div>
                <div className="text-sm text-gray-500">
                  Got an error? Send your logs file to us at founders@hyprnote.com
                </div>
              </div>
            </div>
            <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
          </button>
          <br />
          {/* User ID */}
          <div className="text-sm text-gray-500">
            User ID: <span className="font-mono bg-gray-100 px-1 rounded select-text cursor-text">{userId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
