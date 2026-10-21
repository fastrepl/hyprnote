# Napkin Figures for Blog Posts

Use Napkin for conceptual blog figures such as workflows, privacy/data-flow
diagrams, decision trees, comparisons, and abstract explainers. Never use it
to fabricate product UI.

Generated Napkin URLs expire after 30 minutes, so accepted figures are uploaded
immediately to the Cloudflare R2 bucket `fastrepl-static-assets` (account
johntopia) at `anarlog/blog/articles/<slug>/<filename>`. Uploads use bucket-scoped
R2 S3 credentials from Infisical production `/anarlog/web` through
`ANARLOG_R2_ACCOUNT_ID`, `ANARLOG_R2_ACCESS_KEY_ID`, and
`ANARLOG_R2_SECRET_ACCESS_KEY`. Use the Infisical commands below; never pass
credentials as CLI arguments or commit them to the repository.
The S3 write uses `If-None-Match: *` so concurrent publishers cannot replace an object. The script refuses a path that already serves different bytes
and verifies the upload through the public URL. Published figures are never
replaced: regenerate under a new filename.

Use the branded serving URL in posts:

`https://static.anarlog.so/blog/articles/<slug>/<filename>`

## Batch usage

Declare figures per article in `content/articles/figures.json`, then run:

```bash
infisical run --silent \
  --env=prod \
  --projectId=87dad7b5-72a6-4791-9228-b3b86b169db1 \
  --path=/anarlog/web \
  -- pnpm -F @anlg/web media:figures --slug <slug>
```

Add `--dry-run` to print requests without calling Napkin. An empty manifest array marks an article as deliberately
figure-less.

## Validation

```bash
pnpm -F @anlg/web media:figures:check
```

The check needs no credentials. It validates the manifest, checks each declared
figure and every `https://static.anarlog.so/blog/...` reference with a public
HEAD request, and rejects direct Supabase, local, and legacy proxy image URLs.

## Single-figure usage

```bash
infisical run --silent \
  --env=prod \
  --projectId=87dad7b5-72a6-4791-9228-b3b86b169db1 \
  --path=/anarlog/web \
  -- pnpm --dir apps/web exec node scripts/napkin-figure.mjs \
    --slug meeting-minutes-software \
    --filename meeting-minutes-workflow.png \
    --content-file /tmp/meeting-minutes-workflow.txt \
    --context "Anarlog blog figure for private, bot-free meeting notes" \
    --visual-query flowchart \
    --orientation horizontal \
    --width 1200
```

The script prints the Napkin request ID, generated file metadata, storage path,
and the `https://static.anarlog.so/blog/...` URL to use in MDX. It never
overwrites an existing object.
