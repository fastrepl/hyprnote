import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { cn } from "@hypr/ui/lib/utils";

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "w-16 h-16 rounded-full",
            "bg-white shadow-lg hover:shadow-xl",
            "transition-all hover:scale-105",
            "flex items-center justify-center",
            "border border-neutral-200",
            "overflow-hidden"
          )}
        >
          <img 
            src="/assets/dynamic.gif" 
            alt="Chat Assistant" 
            className="w-12 h-12 object-contain"
            onError={(e) => {
              // Fallback to a text icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '💬';
              target.parentElement!.classList.add('text-3xl');
            }}
          />
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-96 h-[500px] mb-2 mr-2 p-0 overflow-hidden"
        side="top"
        align="end"
        sideOffset={10}
      >
        <div className="h-full flex flex-col bg-white">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <h3 className="font-semibold text-lg">Chat Assistant</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 text-xl"
            >
              ×
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-center text-neutral-400 mt-20">
              Chat interface will appear here
            </div>
          </div>
          
          <div className="p-4 border-t border-neutral-200">
            <input 
              type="text" 
              placeholder="Type a message..."
              className="w-full px-3 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
