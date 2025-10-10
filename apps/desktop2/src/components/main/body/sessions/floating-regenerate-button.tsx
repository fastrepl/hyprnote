import { Button } from "@hypr/ui/components/ui/button";
import { SparklesIcon } from "lucide-react";


export function FloatingRegenerateButton() {
  return (
    <Button
      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black hover:bg-neutral-800 text-white px-4 py-2 rounded-lg shadow-lg"
      onClick={() => {
        console.log("regenerate clicked");
      }}
    >
      <SparklesIcon className="w-4 h-4 mr-2" />
      Regenerate
    </Button>
  );
}