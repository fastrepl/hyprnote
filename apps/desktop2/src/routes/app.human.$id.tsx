import { createFileRoute } from "@tanstack/react-router";
import * as hybrid from "../tinybase/store/hybrid";
export const Route = createFileRoute("/app/human/$id")({
  component: Component,
});

function Component() {
  const { id } = Route.useParams();
  const human = hybrid.UI.useRow("humans", id);
  return <pre>{JSON.stringify(human, null, 2)}</pre>;
}
