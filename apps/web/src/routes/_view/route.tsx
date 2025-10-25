import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_view")({
  component: Component,
});

function Component() {
  return (
    <div>
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-neutral-100 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-0 py-6 border-x border-neutral-100">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
              H
            </div>
            <span className="font-semibold text-lg">Hyprnote</span>
          </Link>
          <nav className="flex items-center gap-6">
            <div className="flex gap-3">
              <Link
                to="/app/auth"
                search={{ type: "signin" }}
                className="px-3 h-8 flex items-center text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                Sign up
              </Link>
              <Link
                to="/downloads"
                className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-blue-600 to-blue-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
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
            <a href="/privacy" className="hover:text-neutral-800 transition-colors">
              Privacy
            </a>
            <a href="/terms" className="hover:text-neutral-800 transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
