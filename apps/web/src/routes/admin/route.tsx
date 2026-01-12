import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { fetchAdminUser } from "@/functions/admin";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    if (import.meta.env.DEV) {
      return { user: { email: "dev@local", isAdmin: true } };
    }

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
    <div className="min-h-screen bg-white flex flex-col">
      <AdminHeader user={user} />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function AdminHeader({ user }: { user: { email: string } }) {
  const firstName = user.email.split("@")[0].split(".")[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <header className="h-16 border-b border-neutral-100 bg-white">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-serif2 italic text-stone-600 text-lg">
            Content Admin
          </span>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-sm text-neutral-600">
            Welcome {displayName}!
          </span>
          <Link
            to="/"
            className={cn([
              "text-sm text-neutral-500 hover:text-neutral-700 transition-colors",
              "hover:underline decoration-dotted",
            ])}
          >
            logout
          </Link>
        </div>
      </div>
    </header>
  );
}
