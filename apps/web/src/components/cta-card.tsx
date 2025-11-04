import { cn } from "@hypr/utils";

interface CtaCardProps {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export function CtaCard({
  title = "Talk to the founders",
  description =
    "Drowning in back-to-back meetings? In 20 minutes, we'll show you how to take control of your notes and reclaim hours each week.",
  buttonText = "Book a call",
  buttonUrl = "/founders",
}: CtaCardProps) {
  return (
    <div className="my-12 border border-neutral-200 rounded-sm overflow-hidden bg-white bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-size-[24px_24px] bg-position-[12px_12px,12px_12px]">
      <div className="p-8 text-center">
        <h3 className="font-serif text-2xl text-stone-600 mb-3">{title}</h3>
        {description && <p className="text-base text-neutral-600 mb-6 max-w-2xl mx-auto">{description}</p>}
        <a
          href={buttonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn([
            "group px-6 h-12 min-w-52 inline-flex items-center justify-center text-base sm:text-lg",
            "bg-linear-to-t from-stone-600 to-stone-500 rounded-full ",
            "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
            "transition-all",
            "text-white! no-underline!",
          ])}
        >
          {buttonText}
        </a>
      </div>
    </div>
  );
}
