import { ReactNode } from "react";

interface NoteWindowProps {
  children: ReactNode;
  className?: string;
}

export function NoteWindow({ children, className = "" }: NoteWindowProps) {
  return (
    <div className={`w-[400px] bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-1000 ${className}`}>
      {/* Window Controls */}
      <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
      </div>
      {children}
    </div>
  );
}
