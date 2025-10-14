import { flattenTranscript, mergeContent } from "./utils";

export function createSessionSearchableContent(row: Record<string, unknown>): string {
  return mergeContent([
    row.raw_md,
    row.enhanced_md,
    flattenTranscript(row.transcript),
  ]);
}

export function createHumanSearchableContent(row: Record<string, unknown>): string {
  return mergeContent([row.email, row.job_title, row.linkedin_username]);
}
