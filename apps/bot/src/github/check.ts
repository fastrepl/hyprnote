import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { Probot } from "probot";

export type ProbotContext = Parameters<Parameters<Probot["on"]>[1]>[0];

export type ChecksCreateParams =
  RestEndpointMethodTypes["checks"]["create"]["parameters"];

export async function createOrUpdateCheck(
  context: ProbotContext,
  params: ChecksCreateParams,
): Promise<void> {
  const existingChecks = await context.octokit.checks.listForRef({
    owner: params.owner,
    repo: params.repo,
    ref: params.head_sha,
    check_name: params.name,
  });

  if (existingChecks.data.check_runs.length > 0) {
    const existingCheck = existingChecks.data.check_runs[0];
    await context.octokit.checks.update({
      owner: params.owner,
      repo: params.repo,
      check_run_id: existingCheck.id,
      status: params.status,
      conclusion: params.conclusion,
      output: params.output,
    });
  } else {
    await context.octokit.checks.create(params);
  }
}
