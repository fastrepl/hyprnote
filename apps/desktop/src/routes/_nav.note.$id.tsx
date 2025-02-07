import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  commands,
  type ConfigDataGeneral,
  type ConfigDataProfile,
} from "@/types/tauri.gen";
import { SessionProvider } from "@/contexts";
import EditorArea from "@/components/note/editor";

function Component() {
  const { session } = Route.useLoaderData();

  return (
    <SessionProvider session={session}>
      <EditorArea />
    </SessionProvider>
  );
}

export const Route = createFileRoute("/_nav/note/$id")({
  component: Component,
  loader: ({ context: { queryClient }, params: { id } }) => {
    return queryClient.fetchQuery({
      queryKey: ["note", { id }],
      queryFn: async () => {
        const [session, profile, general, builtinTemplates, customTemplates] =
          await Promise.all([
            commands.getSession({ id }),
            commands.getConfig("profile"),
            commands.getConfig("general"),
            commands.listBuiltinTemplates(),
            commands.listTemplates(),
          ]);
        if (!session) {
          throw redirect({ to: "/" });
        }

        return {
          session,
          profile: profile?.data as ConfigDataProfile,
          general: general?.data as ConfigDataGeneral,
          templates: [...builtinTemplates, ...customTemplates],
        };
      },
    });
  },
});
