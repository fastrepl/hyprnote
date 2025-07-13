import { Alert, Button, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconBook, IconBrandGithub, IconExternalLink, IconMessageCircle, IconUsers } from "@tabler/icons-react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { listApiKey } from "@/services/key.api";

export const Route = createFileRoute("/app/home")({
  component: Component,
  beforeLoad: ({ context }) => {
    if (!context.userSession) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    const apiKeys = await listApiKey();
    return { apiKeys };
  },
});

function Component() {
  const { apiKeys } = Route.useLoaderData();

  return (
    <Stack gap="xl">
      <div>
        <Title order={1}>
          Home
        </Title>
        <Text c="dimmed" size="sm">
          Welcome to your Hyprnote Admin dashboard
        </Text>
      </div>

      {!apiKeys?.length && (
        <Alert title="Hyprnote client not connected" color="blue">
          Go to{" "}
          <Link
            className="underline"
            to="/app/settings"
          >
            Settings
          </Link>{" "}
          to connect.
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 2 }} spacing="md">
        {dashboardCards.map((card, index) => (
          <Card key={index} shadow="sm" padding="xl" radius="md" withBorder style={{ minHeight: "200px" }}>
            <Group gap="xs" mb="lg">
              {card.icon}
              <Text fw={500} size="lg">{card.title}</Text>
            </Group>
            <Text size="sm" c="dimmed" mb="xl" style={{ lineHeight: 1.6 }}>
              {card.description}
            </Text>
            {card.button.to
              ? (
                <Button
                  variant="light"
                  size="sm"
                  leftSection={card.button.icon}
                  component={Link}
                  to={card.button.to}
                >
                  {card.button.text}
                </Button>
              )
              : (
                <Button
                  variant="light"
                  size="sm"
                  leftSection={card.button.icon}
                  component="a"
                  href={card.button.href}
                  target={card.button.external ? "_blank" : undefined}
                >
                  {card.button.text}
                </Button>
              )}
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

interface DashboardCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  button: {
    text: string;
    icon: React.ReactNode;
    href?: string;
    to?: string;
    external?: boolean;
  };
}

const dashboardCards: DashboardCard[] = [
  {
    title: "Documentation",
    description: "Explore Hyprnote's comprehensive documentation, API references, and integration guides.",
    icon: <IconBook size={20} />,
    button: {
      text: "View Docs",
      icon: <IconExternalLink size={16} />,
      href: "https://docs.hyprnote.com",
      external: true,
    },
  },
  {
    title: "GitHub",
    description: "View the source code, contribute to the project, and report issues on GitHub.",
    icon: <IconBrandGithub size={20} />,
    button: {
      text: "View Repository",
      icon: <IconExternalLink size={16} />,
      href: "https://github.com/fastrepl/hyprnote",
      external: true,
    },
  },
  {
    title: "Talk with Founders",
    description: "Get in touch directly with the Hyprnote team for feedback, partnerships, or support.",
    icon: <IconMessageCircle size={20} />,
    button: {
      text: "Book a meeting",
      icon: <IconExternalLink size={16} />,
      href: "https://cal.com/team/hyprnote/intro",
      external: true,
    },
  },
  {
    title: "Community",
    description: "Join the Hyprnote community, share ideas, and connect with other users.",
    icon: <IconUsers size={20} />,
    button: {
      text: "Join Discord",
      icon: <IconExternalLink size={16} />,
      href: "https://hyprnote.com/discord",
      external: true,
    },
  },
];
