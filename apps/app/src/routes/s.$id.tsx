import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/s/$id")({
  loader: async ({ params }) => {
    return {
      data: params.id,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = Route.useLoaderData();

  return (
    <div className="h-screen w-screen p-8 bg-gray-200">
      <div dangerouslySetInnerHTML={{ __html: data }} />
    </div>
  );
}
