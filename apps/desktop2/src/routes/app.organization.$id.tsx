import { createFileRoute } from "@tanstack/react-router";
import * as persisted from "../tinybase/store/persisted";

export const Route = createFileRoute("/app/organization/$id")({
  component: Component,
});

function Component() {
  const { id } = Route.useParams();
  const organization = persisted.UI.useRow("organizations", id);
  return <pre>{JSON.stringify(organization, null, 2)}</pre>;
}
