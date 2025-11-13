import type { SearchFilters } from "./types";

export function buildOramaFilters(
  filters: SearchFilters | null,
): Record<string, any> | undefined {
  if (!filters || !filters.created_at) {
    return undefined;
  }

  const createdAtConditions: Record<string, number> = {};

  if (filters.created_at.gte !== undefined) {
    createdAtConditions.gte = filters.created_at.gte;
  }
  if (filters.created_at.lte !== undefined) {
    createdAtConditions.lte = filters.created_at.lte;
  }
  if (filters.created_at.gt !== undefined) {
    createdAtConditions.gt = filters.created_at.gt;
  }
  if (filters.created_at.lt !== undefined) {
    createdAtConditions.lt = filters.created_at.lt;
  }
  if (filters.created_at.eq !== undefined) {
    createdAtConditions.eq = filters.created_at.eq;
  }

  return Object.keys(createdAtConditions).length > 0
    ? { created_at: createdAtConditions }
    : undefined;
}
