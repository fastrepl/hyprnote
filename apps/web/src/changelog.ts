import { allChangelogs, type Changelog } from "content-collections";
import semver from "semver";

export type ChangelogWithMeta = Changelog & {
  beforeVersion: string | null;
  newerSlug: string | null;
  olderSlug: string | null;
};

function buildChangelogMeta(): ChangelogWithMeta[] {
  const parsed = allChangelogs
    .map((doc) => {
      const version = semver.parse(doc.version);
      if (!version) {
        return null;
      }

      return { doc, version };
    })
    .filter(
      (
        entry,
      ): entry is {
        doc: Changelog;
        version: semver.SemVer;
      } => entry !== null,
    );

  parsed.sort((a, b) => semver.compare(a.version, b.version));

  const stableByMajorMinor: Record<string, number[]> = {};
  const preByBase: Record<string, number[]> = {};
  const allStableAsc: number[] = [];

  parsed.forEach((entry, idx) => {
    const v = entry.version;
    const majorMinor = `${v.major}.${v.minor}`;
    const base = `${v.major}.${v.minor}.${v.patch}`;

    if (v.prerelease.length === 0) {
      allStableAsc.push(idx);
      (stableByMajorMinor[majorMinor] ??= []).push(idx);
    } else {
      (preByBase[base] ??= []).push(idx);
    }
  });

  const stablePos: Record<number, number> = {};
  allStableAsc.forEach((idx, pos) => {
    stablePos[idx] = pos;
  });

  const withMeta: ChangelogWithMeta[] = parsed.map(({ doc }) => ({
    ...doc,
    beforeVersion: null,
    newerSlug: null,
    olderSlug: null,
  }));

  // Pre-releases: chain within same base
  Object.values(preByBase).forEach((indices) => {
    indices.forEach((idx, j) => {
      if (j === 0) {
        withMeta[idx].beforeVersion = null;
        return;
      }

      const prevIdx = indices[j - 1];
      withMeta[idx].beforeVersion = parsed[prevIdx].doc.version;
    });
  });

  // Stable releases: previous stable within same major/minor, or earliest pre
  Object.entries(stableByMajorMinor).forEach(([_, indicesForMm]) => {
    indicesForMm.forEach((idxInParsed, posInMm) => {
      const entry = parsed[idxInParsed];
      const v = entry.version;
      const base = `${v.major}.${v.minor}.${v.patch}`;

      if (posInMm > 0) {
        const prevIdx = indicesForMm[posInMm - 1];
        withMeta[idxInParsed].beforeVersion = parsed[prevIdx].doc.version;
        return;
      }

      const preIndices = preByBase[base];
      if (preIndices && preIndices.length > 0) {
        const firstPreIdx = preIndices[0];
        withMeta[idxInParsed].beforeVersion = parsed[firstPreIdx].doc.version;
        return;
      }

      const globalPos = stablePos[idxInParsed];
      if (globalPos > 0) {
        const prevGlobalIdx = allStableAsc[globalPos - 1];
        withMeta[idxInParsed].beforeVersion = parsed[prevGlobalIdx].doc.version;
      }
    });
  });

  // Navigation: compute newer/older in descending order (newest first)
  const descOrder = parsed
    .map((entry, idx) => ({ idx, version: entry.version }))
    .sort((a, b) => semver.rcompare(a.version, b.version))
    .map((entry) => entry.idx);

  descOrder.forEach((idxInParsed, position) => {
    const newerIdx = position > 0 ? descOrder[position - 1] : undefined;
    const olderIdx =
      position < descOrder.length - 1 ? descOrder[position + 1] : undefined;

    withMeta[idxInParsed].newerSlug =
      newerIdx !== undefined ? parsed[newerIdx].doc.slug : null;
    withMeta[idxInParsed].olderSlug =
      olderIdx !== undefined ? parsed[olderIdx].doc.slug : null;
  });

  // Return in descending order to match UI expectations
  return descOrder.map((idx) => withMeta[idx]);
}

let cache: ChangelogWithMeta[] | null = null;

function getAllChangelogMeta(): ChangelogWithMeta[] {
  if (!cache) {
    cache = buildChangelogMeta();
  }

  return cache;
}

export function getChangelogList(): ChangelogWithMeta[] {
  return getAllChangelogMeta();
}

export function getChangelogBySlug(
  slug: string,
): ChangelogWithMeta | undefined {
  return getAllChangelogMeta().find((entry) => entry.slug === slug);
}
