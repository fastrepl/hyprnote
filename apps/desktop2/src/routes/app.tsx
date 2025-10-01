import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "../components/sidebar";

export const Route = createFileRoute("/app")({
  component: Component,
});

function Component() {
  return (
    <>
      <Outlet />
      <Sidebar />
    </>
  );
}
