import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_nav")({
  component: Component,
});

function Component() {
  return (
    <>
      <header className="w-full border-b">
        <nav className="px-4">
          <div className="flex h-12 items-center justify-between">
            <button>Button</button>
            <button>Settings</button>
          </div>
        </nav>
      </header>
      <Outlet />
    </>
  );
}
