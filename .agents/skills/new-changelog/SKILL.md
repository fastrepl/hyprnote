---
name: new-changelog
description: Create stable or Nightly desktop changelogs. Keep stable entries under packages/changelog/content for website publication and Nightly notes in packages/changelog/nightly.md for app and GitHub release snapshots.
metadata:
  internal: true
---

## Channel contract

Create changelogs for both stable and Nightly. Only stable entries are published
on the website. The website imports `packages/changelog/content/*.md` and
accepts only filenames matching `<major>.<minor>.<patch>.md`.

- Stable: write `packages/changelog/content/<version>.md`, covering all desktop
  user-facing changes since the previous stable release, including changes
  previously described in Nightly notes.
- Nightly: update `packages/changelog/nightly.md` before merging product changes.
  Keep a curated cumulative list for the current development cycle. The build
  embeds this file and snapshots it into each GitHub Nightly prerelease, so
  previous Nightly release notes remain attached to their exact version.
  Reset the working list after stable publishes, preserving the GitHub snapshots.
- Do not put Nightly notes under the website content directory, link them into
  the website changelog, or send a product-update newsletter for every Nightly.
- Announce the revived Nightly in the next stable changelog, with an opt-in link
  to `https://anarlog.so/download/nightly/`. Existing users stay on stable.
  Verify the first Nightly installers and update feed before publishing that claim.

## Stable version

Determine the next desktop version by inspecting `.github/workflows/desktop_cd.yaml` and running:

```bash
doxxer --config doxxer.desktop.toml current
doxxer --config doxxer.desktop.toml next patch
```

Create the new markdown file in `packages/changelog/content` for that version.

When preparing a release, also follow the
[release surface review](../release-new-version/SKILL.md#release-surface-review).
Check the product changes for CLI, local and hosted MCP, API, agent-package, and
documentation updates before freezing the release candidate. Record any gaps
in the release task; a changelog alone does not establish release readiness.
Creating a changelog does not itself dispatch or publish a release.

Each changelog file must start with frontmatter that includes both `date` and
`summary`:

```md
---
date: "YYYY-MM-DD"
summary: "One concise, user-facing sentence for the changelog index preview."
---
```

Keep `summary` plain text. Do not use markdown or custom tags in it. The web
changelog index renders this field directly, so it should describe the release
at a glance without leaking implementation details.
