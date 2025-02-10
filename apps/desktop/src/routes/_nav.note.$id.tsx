import { createFileRoute, redirect } from "@tanstack/react-router";
import { commands, type Config } from "@/types";
import { SessionProvider } from "@/contexts";
import EditorArea from "@/components/note/editor";
import NoteAIButton from "@/components/note-ai-button";

function Component() {
  const { session } = Route.useLoaderData();

  return (
    <SessionProvider session={session}>
      <div className="relative flex h-full flex-col overflow-hidden">
        <EditorArea />
        <NoteAIButton />
      </div>
    </SessionProvider>
  );
}

export const Route = createFileRoute("/_nav/note/$id")({
  component: Component,
  loader: ({ context: { queryClient }, params: { id } }) => {
    return queryClient.fetchQuery({
      queryKey: ["note", { id }],
      queryFn: async () => {
        const [session, config, builtinTemplates, customTemplates] =
          await Promise.all([
            commands.getSession({ id }),
            commands.getConfig(),
            commands.listBuiltinTemplates(),
            commands.listTemplates(),
          ]);
        if (!session) {
          throw redirect({ to: "/" });
        }

        return {
          session,
          config: config as Config,
          templates: [...builtinTemplates, ...customTemplates],
        };
      },
    });
  },
});
