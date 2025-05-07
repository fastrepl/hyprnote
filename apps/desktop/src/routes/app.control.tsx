import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/app/control")({
  component: RouteComponent,
});

function RouteComponent() {
  useEffect(() => {
    document.body.style.background = "transparent";
  }, []);

  return (
    <div
      className="w-screen h-[100vh] bg-transparent relative overflow-y-hidden"
      style={{ scrollbarColor: "auto transparent" }}
    >
      <div className="w-full h-full bg-red-500"></div>
    </div>
  );
}
