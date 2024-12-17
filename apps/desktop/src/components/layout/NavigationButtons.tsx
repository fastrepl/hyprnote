import { RiHome2Line, RiArrowLeftSLine } from "@remixicon/react";

interface NavigationButtonsProps {
  onHomeClick: () => void;
  onBackClick: () => void;
}

export default function NavigationButtons({
  onHomeClick,
  onBackClick,
}: NavigationButtonsProps) {
  return (
    <>
      <button onClick={onHomeClick} className="rounded p-2 hover:bg-gray-100">
        <RiHome2Line className="size-5" />
      </button>
      <button onClick={onBackClick} className="rounded p-2 hover:bg-gray-100">
        <RiArrowLeftSLine className="size-5" />
      </button>
    </>
  );
}
