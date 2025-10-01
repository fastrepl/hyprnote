import { createFileRoute } from "@tanstack/react-router";
import { useRow } from "tinybase/ui-react";

import { commands as windowsCommands } from "@hypr/plugin-windows";

import { mainCloudSync, mainStore } from "../tinybase";

export const Route = createFileRoute("/app/")({
  component: Component,
});

function Component() {
  const row = useRow("users", "1", mainStore);

  const handleSeed = () => {
    mainStore.setTables({
      users: {
        "1": { name: "Alice Johnson", email: "alice@example.com" },
        "2": { name: "Bob Smith", email: "bob@example.com" },
        "3": { name: "Carol Williams", email: "carol@example.com" },
      },
      sessions: {
        "s1": {
          userId: "1",
          title: "Project Planning",
          body: "Planning the new project",
          createdAt: new Date("2025-09-25T10:00:00").toISOString(),
        },
        "s2": {
          userId: "2",
          title: "Team Meeting Notes",
          body: "Discussion about Q4 goals",
          createdAt: new Date("2025-09-26T14:30:00").toISOString(),
        },
        "s3": {
          userId: "1",
          title: "Design Review",
          body: "UI/UX design feedback",
          createdAt: new Date("2025-09-27T09:15:00").toISOString(),
        },
        "s4": {
          userId: "3",
          title: "Bug Tracking",
          body: "Critical bugs to fix",
          createdAt: new Date("2025-09-28T11:00:00").toISOString(),
        },
        "s5": {
          userId: "2",
          title: "Performance Analysis",
          body: "App performance metrics",
          createdAt: new Date("2025-09-29T16:45:00").toISOString(),
        },
        "s6": {
          userId: "1",
          title: "Client Feedback",
          body: "Feedback from client meeting",
          createdAt: new Date("2025-09-30T13:20:00").toISOString(),
        },
        "s7": {
          userId: "3",
          title: "Sprint Retrospective",
          body: "What went well and what didn't",
          createdAt: new Date("2025-09-30T15:00:00").toISOString(),
        },
        "s8": {
          userId: "2",
          title: "Code Review",
          body: "Pull request reviews",
          createdAt: new Date("2025-10-01T08:30:00").toISOString(),
        },
        "s9": {
          userId: "1",
          title: "Documentation Update",
          body: "Updated API documentation",
          createdAt: new Date("2025-10-01T10:15:00").toISOString(),
        },
        "s10": {
          userId: "3",
          title: "Testing Strategy",
          body: "E2E testing approach",
          createdAt: new Date("2025-10-01T11:45:00").toISOString(),
        },
        "s11": {
          userId: "2",
          title: "Deployment Plan",
          body: "Production deployment checklist",
          createdAt: new Date("2025-10-01T14:00:00").toISOString(),
        },
        "s12": {
          userId: "1",
          title: "Security Audit",
          body: "Security review findings",
          createdAt: new Date("2025-10-01T16:30:00").toISOString(),
        },
      },
    });
  };

  const handleCLick = () => {
    windowsCommands.windowShow({ type: "settings" });
  };

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>
      <p>{JSON.stringify(row)}</p>

      <button onClick={handleCLick}>Open</button>
      <button onClick={handleSeed}>Seed</button>
      <button onClick={mainCloudSync.sync}>sync</button>
    </main>
  );
}
