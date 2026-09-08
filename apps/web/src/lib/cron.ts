export async function runScheduledJob(
  request: Request,
  run: () => Promise<void>,
  environment: { CRON_SECRET?: string; CRON_JOBS_ENABLED?: string } = {
    CRON_SECRET: process.env.CRON_SECRET,
    CRON_JOBS_ENABLED: process.env.CRON_JOBS_ENABLED,
  },
) {
  const headers = { "cache-control": "no-store" };
  if (
    !environment.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${environment.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", { status: 401, headers });
  }
  // Keep the new scheduler idle until the previous host's jobs are disabled.
  if (environment.CRON_JOBS_ENABLED !== "true") {
    return Response.json({ skipped: true }, { headers });
  }
  await run();
  return Response.json({ success: true }, { headers });
}
