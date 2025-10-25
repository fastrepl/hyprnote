import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";

import { signOutFn } from "@/functions/auth";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/_view")({
  component: Component,
  loader: async ({ context }) => ({ user: context.user }),
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
              <HeaderUser />
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

function HeaderUser() {
  const { user } = Route.useLoaderData();
  const navigate = useNavigate();

  const signOut = useMutation({
    mutationFn: async () => {
      const res = await signOutFn();
      if (res.success) {
        return true;
      }

      throw new Error(res.message);
    },
    onSuccess: () => {
      navigate({ to: "/" });
    },
    onError: (error) => {
      console.error(error);
      navigate({ to: "/" });
    },
  });

  if (user) {
    return (
      <div className="flex flex-row gap-2">
        <Link
          to="/app/account"
          className="px-3 h-8 flex items-center text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          Account
        </Link>
        <button
          onClick={() => signOut.mutate()}
          className="px-3 h-8 flex items-center text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <Link
      to="/auth"
      search={{ flow: "web" }}
      className="px-3 h-8 flex items-center text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
    >
      Get Started
    </Link>
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
