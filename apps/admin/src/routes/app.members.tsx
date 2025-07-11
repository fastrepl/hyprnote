import { createFileRoute } from "@tanstack/react-router";

import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/app/members")({
  component: Component,
});

const a = async () => {
  await authClient.organization.create({
    name: "My Organization",
    slug: "my-org",
    logo: undefined,
  });
};

function Component() {
  return <div>Hello "/app/members"!</div>;
}
