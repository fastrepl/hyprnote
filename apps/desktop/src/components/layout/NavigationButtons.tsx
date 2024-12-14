import { Home, ChevronLeft } from "lucide-react";

interface NavigationButtonsProps {
  onHomeClick: () => void;
  onBackClick: () => void;
}

export default function NavigationButtons({ onHomeClick, onBackClick }: NavigationButtonsProps) {
  return (
    <>
      <button
        onClick={onHomeClick}
        className="rounded p-2 hover:bg-gray-100"
      >
        <Home className="size-5" />
      </button>
      <button
        onClick={onBackClick}
        className="rounded p-2 hover:bg-gray-100"
      >
        <ChevronLeft className="size-5" />
      </button>
    </>
  );
}
