import { cn } from "@hypr/utils";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cal")({
  component: Component,
});

function Component() {
  return (
    <Container>
      <Header />
      <BookingButton />
      <FAQ />
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn([
        "flex items-center justify-center min-h-screen p-4",
        "bg-linear-to-b from-stone-50 via-stone-100/50 to-stone-50",
      ])}
    >
      <div className="max-w-2xl w-full mx-auto">
        <div
          className="border border-neutral-200 p-4 rounded-sm"
          style={{ backgroundImage: "url(/patterns/white_leather.png)" }}
        >
          <div
            className="bg-stone-50 border border-neutral-200 rounded-sm p-8 sm:p-12"
            style={{ backgroundImage: "url(/patterns/paper.png)" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <>
      <h1 className="font-serif text-3xl sm:text-4xl font-medium text-stone-900 mb-4 text-center">
        Skip the Waitlist
      </h1>
      <p className="text-lg text-stone-600 mb-8 text-center">
        Book a quick 20-minute chat with the founders and get guaranteed early access to Hyprnote
      </p>
    </>
  );
}

function BookingButton() {
  return (
    <div className="flex justify-center mb-8">
      <a
        href="https://cal.com/team/hyprnote/welcome?duration=20"
        target="_blank"
        rel="noopener noreferrer"
        className={cn([
          "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
          "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
          "hover:scale-[102%] active:scale-[98%]",
          "transition-all",
        ])}
      >
        Book a 20-min chat
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
  );
}

function FAQ() {
  return (
    <div className="pt-6">
      <div className="space-y-3 text-sm">
        <FAQItem
          question="What do we talk about?"
          answer="Your workflow, what you'd use Hyprnote for, and what matters most to you in a note-taking app."
        />
        <FAQItem
          question="Do you screen who books?"
          answer="Yes — we're looking for people genuinely excited about Hyprnote, not just trying to skip the line."
        />
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div>
      <p className="text-stone-900 font-medium">{question}</p>
      <p className="text-stone-600 mt-1">{answer}</p>
    </div>
  );
}
