import { AppShell, Burger, Button, Group, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconHome, IconMist, IconSettings } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { NavLink } from "@/components/NavLink";
import { authClient } from "@/lib/auth/client";
import { getActiveOrganizationFull } from "@/services/auth.api";

export const Route = createFileRoute("/app")({
  component: Component,
  loader: async ({ context: { userSession } }) => {
    if (!userSession || !userSession.session.activeOrganizationId) {
      throw redirect({ to: "/login" });
    }

    const org = await getActiveOrganizationFull();
    if (!org?.slug) {
      throw redirect({ to: "/login" });
    }

    return { slug: org.slug };
  },
});

function Component() {
  const { slug } = Route.useLoaderData();

  const [opened, { toggle }] = useDisclosure();

  const logout = useMutation({
    mutationFn: async () => {
      const startTime = performance.now();
      const { error } = await authClient.signOut();
      await new Promise((resolve) => setTimeout(resolve, Math.max(500, startTime + 500 - performance.now())));

      if (error) {
        throw error;
      }
    },
    onError: (error) => {
      console.log(error);
    },
    onSettled: () => {
      // not sure why, but useNavigate() doesn't work here
      window.location.href = "/";
    },
  });

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" align="center">
          <Group gap="sm" align="center">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Text size="xl" fw={700}>Hyprnote</Text>
            <Text size="md" c="dimmed" fw={500}>{slug}</Text>
          </Group>
          <Button variant="light" size="sm" onClick={() => logout.mutate()}>
            Logout
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          label="Home"
          to="/app/home"
          leftSection={<IconHome size={16} stroke={1.5} />}
        />
        <NavLink
          label="Integrations"
          to="/app/integrations"
          leftSection={<IconMist size={16} stroke={1.5} />}
        />
        <NavLink
          label="Settings"
          to="/app/settings"
          leftSection={<IconSettings size={16} stroke={1.5} />}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
