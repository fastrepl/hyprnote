import { Trans } from "@lingui/react/macro";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { Book, Bug, ExternalLinkIcon, MessageSquare } from "lucide-react";

import { commands as tracingCommands } from "@hypr/plugin-tracing";

export default function HelpFeedback() {
  const handleOpenFeedback = () => {
    openUrl("https://hyprnote.canny.io/feature-requests");
  };

  const handleOpenDocs = () => {
    openUrl("https://docs.hyprnote.com");
  };

  const handleReportBug = () => {
    openUrl("https://hyprnote.canny.io/bugs");
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
          <Trans>Help & Support</Trans>
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
                  <Trans>Documentation</Trans>
                </div>
                <div className="text-sm text-gray-500">
                  <Trans>Learn how to use Hyprnote</Trans>
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
                  <Trans>Feature Requests</Trans>
                </div>
                <div className="text-sm text-gray-500">
                  <Trans>Suggest new features and improvements</Trans>
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
                  <Trans>Report a Bug</Trans>
                </div>
                <div className="text-sm text-gray-500">
                  <Trans>Help us improve by reporting issues</Trans>
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
                  <Trans>Logs</Trans>
                </div>
                <div className="text-sm text-gray-500">
                  <Trans>View logs</Trans>
                </div>
              </div>
            </div>
            <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
