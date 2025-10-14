import { Building2, CheckCircle, MessageCircle, User } from "lucide-react";

export function ChatBodyEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
      <img src="/assets/dynamic.gif" alt="Hyprnote" className="w-24 h-24 mb-6 mt-12" />
      <p className="text-neutral-600 text-base mb-1">Ask the AI assistant about anything.</p>
      <p className="text-neutral-400 text-sm mb-10">It can also do few cool stuff for you.</p>

      <div className="flex flex-col gap-3 items-center w-full">
        <button className="flex items-center gap-3 px-0 py-2 text-left text-neutral-700 hover:text-neutral-900 transition-colors">
          <User className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Tell me more about John Jeong</span>
        </button>

        <button className="flex items-center gap-3 px-0 py-2 text-left text-neutral-700 hover:text-neutral-900 transition-colors">
          <Building2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Tell me more about Fastrepl, Inc.</span>
        </button>

        <button className="flex items-center gap-3 px-0 py-2 text-left text-neutral-700 hover:text-neutral-900 transition-colors">
          <MessageCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Summarize the last meeting</span>
        </button>

        <button className="flex items-center gap-3 px-0 py-2 text-left text-neutral-700 hover:text-neutral-900 transition-colors">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Check if next steps are all done</span>
        </button>
      </div>
    </div>
  );
}
