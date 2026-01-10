import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { fetchAdminUser } from "@/functions/admin";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const user = await fetchAdminUser();

    if (!user) {
      throw redirect({
        to: "/auth",
        search: {
          flow: "web",
          redirect: "/admin",
        },
      });
    }

    if (!user.isAdmin) {
      throw redirect({
        to: "/",
      });
    }

    return { user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = Route.useRouteContext();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <a
                href="/admin"
                className="text-xl font-semibold text-neutral-900"
              >
                Admin
              </a>
              <nav className="flex gap-4">
                <a
                  href="/admin"
                  className="text-sm text-neutral-600 hover:text-neutral-900"
                >
                  Dashboard
                </a>
                <a
                  href="/admin/media"
                  className="text-sm text-neutral-600 hover:text-neutral-900"
                >
                  Media
                </a>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-500">{user.email}</span>
              <a
                href="/"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                Exit Admin
              </a>
            </div>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
