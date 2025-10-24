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
    <header className="border-b">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
              H
            </div>
            <span className="font-semibold text-lg">Hyprnote</span>
          </div>

          <nav className="flex items-center gap-6">
            <a href="/docs" className="text-sm hover:text-blue-600">
              Docs
            </a>
            <a href="/blog" className="text-sm hover:text-blue-600">
              Blog
            </a>
            <a href="/pricing" className="text-sm hover:text-blue-600">
              Pricing
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/app/auth" search={{ type: "signin" }} className="text-sm hover:text-blue-600">
            Sign in
          </Link>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
            Download
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="p-4 border-t">
      <p>Hyprnote</p>
    </footer>
  );
}
