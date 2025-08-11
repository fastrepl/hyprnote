import { CloudIcon, ExternalLinkIcon } from "lucide-react";

export function STTViewRemote() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
      <div className="text-center mb-6">
        <CloudIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Custom Transcription
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400">
          Coming Soon
        </p>
      </div>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <p>
          Powered by{" "}
          <a
            href="https://docs.hyprnote.com/owhisper/what-is-this"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            Owhisper
            <ExternalLinkIcon className="w-3 h-3" />
          </a>
        </p>
        <p>
          Interested in team features?{" "}
          <a
            href="mailto:help@hyprnote.com"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Contact help@hyprnote.com
          </a>
        </p>
      </div>
    </div>
  );
}
