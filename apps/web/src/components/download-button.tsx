import { cn } from "@hypr/utils";

import { Link } from "@tanstack/react-router";

export function DownloadButton() {
  return (
    <Link
      to="/download"
      className={cn([
        "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
        "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
        "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
        "transition-all",
      ])}
    >
      Download now
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    </Link>
  );
}
