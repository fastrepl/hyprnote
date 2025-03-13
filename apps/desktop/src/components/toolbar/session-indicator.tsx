import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import SoundIndicator from "../sound-indicator";

export function SessionIndicator({ sessionId }: { sessionId: string }) {
  return (
    <Link to="/app/note/$id/main" params={{ id: sessionId }}>
      <button className="w-72 hidden sm:flex flex-row items-center justify-between rounded-md border border-border px-2 py-2 bg-primary transition-all duration-200 text-primary-foreground hover:scale-95">
        <ArrowLeft size={16} />
        <span className="text-xs font-semibold">Return to session</span>
        <SoundIndicator />
      </button>
    </Link>
  );
}
