import { createFileRoute } from "@tanstack/react-router";

import { runScheduledJob } from "@/lib/cron";

const jobs = {
  "loops-account-onboarding": () => import("@/jobs/loops-account-onboarding"),
  "loops-trial-ending-reminders": () =>
    import("@/jobs/loops-trial-ending-reminders"),
  "posthog-account-events": () => import("@/jobs/posthog-account-events"),
};

export const Route = createFileRoute("/api/cron/$job")({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        runScheduledJob(request, async () => {
          if (!Object.hasOwn(jobs, params.job))
            throw new Response("Not found", { status: 404 });
          const { default: run } =
            await jobs[params.job as keyof typeof jobs]();
          await run();
        }),
    },
  },
});
