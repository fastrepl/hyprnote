import { createFileRoute } from "@tanstack/react-router";
import * as hybrid from "../tinybase/store/hybrid";

export const Route = createFileRoute("/app/organization/$id")({
  component: Component,
});

function Component() {
  const { id } = Route.useParams();
  const organization = hybrid.UI.useRow("organizations", id);
  return <pre>{JSON.stringify(organization, null, 2)}</pre>;
}
