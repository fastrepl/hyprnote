import { cn } from "@hypr/utils";

interface CtaCardProps {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export function CtaCard({
  title = "Learn more about Hyprnote directly from the founders",
  description = "Book a quick 20-minute chat with our team to see how Hyprnote can transform your meeting workflow.",
  buttonText = "Book a call",
  buttonUrl = "https://cal.com/team/hyprnote/welcome",
}: CtaCardProps) {
  return (
    <div className="my-12 border border-neutral-200 rounded-sm overflow-hidden bg-white shadow-sm">
      <div className="p-8 text-center">
        <h3 className="font-serif text-2xl text-stone-600 mb-3">{title}</h3>
        {description && <p className="text-base text-neutral-600 mb-6 max-w-2xl mx-auto">{description}</p>}
        <a
          href={buttonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn([
            "group px-6 h-12 inline-flex items-center justify-center text-base",
            "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
            "hover:scale-[102%] active:scale-[98%]",
            "transition-all",
          ])}
        >
          {buttonText}
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
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
