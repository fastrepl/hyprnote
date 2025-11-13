import { Link } from "@tanstack/react-router";

export function NotFoundDocument() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-linear-to-b from-stone-50 to-stone-100 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-medium text-neutral-700 mb-4 font-serif">
            Page Not Found
          </h1>

          <div className="text-[200px] leading-none font-serif text-neutral-800 mb-8">
            404
          </div>

          <p className="text-base text-neutral-600 max-w-md mx-auto">
            We couldn't find the page you were looking for. If you think this is
            an error, you can{" "}
            <a
              href="mailto:support@hyprnote.com"
              className="text-stone-700 underline hover:text-stone-900 transition-colors"
            >
              let us know
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-neutral-100 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-0 py-3 border-x border-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="font-semibold text-2xl font-serif hover:scale-105 transition-transform"
            >
              Hyprnote
            </Link>
            <a
              href="https://docs.hyprnote.com"
              className="text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
            >
              Docs
            </a>
            <a
              href="https://hyprnote.com/blog"
              className="text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
            >
              Blog
            </a>
            <Link
              to="/pricing"
              className="text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
            >
              Pricing
            </Link>
          </div>
          <nav className="flex items-center gap-6">
            <div className="flex gap-3">
              <Link
                to="/auth"
                search={{ flow: "web" }}
                className="px-3 h-8 flex items-center text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                Get Started
              </Link>
              <Link
                to="/download"
                className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
              >
                Download
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-0 py-6 border-x border-neutral-100">
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <p>© {currentYear} Fastrepl, Inc.</p>
          <div className="flex gap-6">
            <a
              href="/privacy"
              className="hover:text-neutral-800 transition-colors"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="hover:text-neutral-800 transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
