import { Trans } from "@lingui/react/macro";
import { MessageCircleIcon } from "lucide-react";

export default function ChatView() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-border max-w-[280px]">
        <div className="flex justify-center mb-4">
          <div className="bg-neutral-100 p-3 rounded-full">
            <MessageCircleIcon className="size-6 text-neutral-500" />
          </div>
        </div>
        <h3 className="text-lg font-medium mb-2">
          <Trans>Chat Assistant</Trans>
        </h3>
        <p className="text-sm text-neutral-500 mb-4">
          <Trans>
            Ask questions about your notes, get summaries, or brainstorm ideas with your AI assistant.
          </Trans>
        </p>
        {/* Chat interface will be implemented here in the future */}
      </div>
    </div>
  );
}
