import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

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
          style={{
            backgroundImage:
              "url(https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/texture/white-leather.png)",
          }}
        >
          <div
            className="bg-stone-50 border border-neutral-200 rounded-sm p-8 sm:p-12"
            style={{
              backgroundImage:
                "url(https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/texture/paper.png)",
            }}
          >
            {children}
          </div>
        </div>
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
          >
            Back to home
          </Link>
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
        Book a quick 20-minute chat with the founders and get guaranteed early
        access to Hyprnote
      </p>
    </>
  );
}

function BookingButton() {
  return (
    <div className="mb-8 flex justify-center">
      <a href="/founders" target="_blank" rel="noopener noreferrer">
        <button
          className={cn([
            "group px-6 h-12 text-base sm:text-lg cursor-pointer",
            "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
            "hover:scale-[102%] active:scale-[98%]",
            "transition-all",
            "flex items-center justify-center",
          ])}
        >
          Book a 20-min chat
        </button>
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
