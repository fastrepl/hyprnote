---
name: release-new-version
description: Release Anarlog desktop stable versions and, when requested, distribute iOS and Android builds through TestFlight, the App Store, or Google Play. Validate and merge the changelog before releasing.
metadata:
  internal: true
---

# Release a New Version

Use this for stable desktop releases and requested mobile store distribution. A stable desktop release must come from `main`, after the changelog for the explicit version is present, accurate, validated, and merged. Mobile uses its own app version and build numbers.

## Core Rule

Do not trigger a stable release from an unmerged branch. First make the changelog up to date, merge that changelog change to `main`, then run the stable release from `main`.

## Scope Boundary

Establish the exact desktop version and requested mobile destination before
dispatching. A desktop release includes its existing Microsoft Store workflow;
it does not imply mobile submission. When mobile is requested, distinguish
TestFlight and Google Play internal testing from public App Store review and
Google Play production rollout. Honor authorization already given in the task;
do not ask again for an approved destination.

App Store here means the iOS app. The repository deliberately has no Mac App
Store release lane; do not recreate one as part of a desktop or mobile release.

Release and QA are separate, explicitly requested workflows. Do not read or
run `qa-critical-ux` or `qa-cli-mcp-api` solely because the user asked for a
release. A release does not require a QA report or QA PASS.

If the user explicitly asks for both release and QA, follow the requested
order and report the outcomes separately. Do not infer that a QA result
approves or blocks the release.

## Release Workflow Requirements

The desktop path covers macOS, Windows, and Linux. Requested mobile distribution
follows the separate native-build and store steps below.
The patched CloudSync vendor bundle is rebuilt from source and
cancellation-tested on every desktop lane: `rebuild-macos.sh` for Apple
Silicon and Intel, `rebuild-windows.sh` under UCRT64 in `windows_ci`, and
`rebuild-linux.sh` in `linux_ci` for x86_64 and aarch64. Each lane then runs
`cargo test -p cloudsync` and `cargo test -p db-core cloudsync::` against that
freshly built library, covering the stalled-network, logout, configuration
cleanup/init, worker-drain, and immediate-local-write cancellation gates.

The rebuild steps run only on `workflow_dispatch`, so a routine pull-request
run does not prove them. Dispatch `desktop_ci.yaml` against the candidate SHA
and confirm the `cloudsync-windows-*` and `cloudsync-linux-*` artifacts before
treating a desktop lane as approved. Do not treat macOS artifacts or
Rust-only tests as cross-platform approval. Check the mobile coverage separately;
its current Android job does not provide the iOS cancellation-test coverage.

## Preflight

1. Inspect the workflow before assuming release behavior:

```bash
cat .github/workflows/desktop_cd.yaml
cat .github/workflows/desktop_ci.yaml
cat .github/workflows/desktop_publish.yaml
cat .github/workflows/desktop_store_publish.yaml
```

2. Validate the explicit stable version requested by the user:

```bash
VERSION=<version>
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
test -f "packages/changelog/content/$VERSION.md"
```

Stable desktop releases never infer a version. The workflow requires the exact
stable semantic version and a matching changelog file.

3. Identify the latest stable desktop tag and the commits that will ship:

```bash
gh release list --limit 20
gh api repos/fastrepl/anarlog/compare/<latest-desktop-tag>...main
git log --oneline <latest-desktop-tag>..<candidate-sha>
```

Verify the latest published, non-prerelease `desktop_v<semver>` tag through
GitHub. GitHub's compare file list can be truncated; use local history and diffs
for the complete changelog review. Use read-only `git` commands for inspection.
Use the `but` skill for local version control, and GitHub tools for PR metadata
and merges. Do not force-fetch tags or force-push to prepare a release.

## Changelog Gate

The changelog is the release gate. Before releasing:

1. Open `packages/changelog/content/AGENTS.md` and follow its instructions.
2. Confirm `packages/changelog/content/<version>.md` exists.
3. Compare the file against the desktop user-facing changes since the latest `desktop_v*` tag.
4. If the changelog is missing or incomplete, update it before release.

Changelog entries should be worth reading for app users. Exclude internal-only refactors, CI changes, infra noise, and implementation details unless they explain a user-visible change.

Each changelog file must include:

```md
---
date: "YYYY-MM-DD"
summary: "One concise, user-facing sentence for the changelog index preview."
---
```

After editing the changelog, run:

```bash
pnpm exec dprint fmt --allow-no-files packages/changelog/content/<version>.md
pnpm exec dprint check --allow-no-files packages/changelog/content/<version>.md
pnpm -F @anlg/changelog typecheck
```

## Merge to Main

Only after the changelog is accurate and validation passes:

1. Commit the changelog change.
2. Open or update the changelog PR.
3. Wait for CI and required review state to be clear.
4. Merge the changelog PR to `main`.
5. Verify `main` contains `packages/changelog/content/<version>.md`.
6. Record the resulting `main` SHA as the release candidate.

If using GitButler, prefer:

```bash
but diff
but commit -b chore/release-changelog -m "Update desktop release changelog

Refresh the desktop changelog for the next stable release." <file-or-hunk-ids>
but pr new chore/release-changelog -t
```

Use actual IDs from `but diff` / `but status -fv`; do not invent IDs.

## Trigger Stable Release

Dispatch the native verification workflow from `main`, then identify its run and
verify `headSha` equals the recorded candidate before accepting any job:

```bash
gh workflow run desktop_ci.yaml --ref main
```

Verify every native job and the source-rebuilt CloudSync artifacts, including
both macOS architectures, Windows, and both Linux architectures. A green
pull-request run skips these jobs. Keep the candidate fixed through publication.

After the changelog merge, verify `main` has not moved, then build the stable
candidate without publishing:

```bash
gh workflow run desktop_cd.yaml \
  --ref main \
  -f channel=stable \
  -f candidate_sha=<40-character-main-sha> \
  -f include_windows=true \
  -f include_linux=true \
  -f version=<version>
```

Watch the dry-run build:

```bash
gh run list --workflow desktop_cd.yaml --branch main --limit 5
gh run view <run-id> --json headSha,url
gh run watch <run-id>
```

The run's `headSha` must equal the recorded release-candidate SHA. A mismatch
blocks acceptance even if the workflow succeeds.

Do not use GitHub's rerun button for a failed stable candidate or optional
Linux audio QA run. Dispatch a fresh run instead; publication only accepts
first-attempt run IDs so evidence cannot be mixed across attempts.

The dry-run workflow must:

- use the exact explicit stable version
- build both Apple Silicon and Intel macOS artifacts
- build the signed Windows and Linux artifacts for the same version and commit
- upload a draft CrabNebula release without publishing it
- upload `desktop-release-provenance-<version>-<sha>`, including the exact
  artifact hashes and pinned CrabNebula CLI version, asset ID, and SHA-256

After the exact dry-run artifacts pass the required platform gates and `main`
still points to the candidate SHA, publish only through the provenance
workflow. Do not run `desktop_linux_audio_qa` as a publish gate; Linux is
covered by the same dry-run provenance as macOS and Windows. That workflow
remains available for optional debugging.

```bash
gh workflow run desktop_publish.yaml \
  --ref main \
  -f version=<version> \
  -f candidate_sha=<40-character-main-sha> \
  -f dry_run_id=<dry-run-id> \
  -f include_windows=true \
  -f include_linux=true
```

Watch that workflow to completion. It must verify the dry-run run identity,
artifact hashes, CrabNebula tool identity and hash, current `main`, and the
immutable tag before publishing. It must also verify every file mirrored to
GitHub against the provenance manifest.

The publish workflow calls `desktop_store_publish.yaml` with
`submit_to_stores=true` for Microsoft Store certification. Inspect that job and
the resulting submission separately from GitHub/CrabNebula publication. For
Linux, the workflow waits for the generated package metadata PR's checks,
merges that exact PR head, calls `web_cd.yaml` with the merged commit, and
verifies the live signed APT metadata for both architectures on `anarlog.so`.
Require `linux-package-bump`, `linux-apt-deploy`, and `linux-apt-verify` to succeed;
a metadata PR or successful merge alone is not APT publication. Failed checks
leave the PR open and fail the release workflow for follow-up. Arch `PKGBUILD`
and `.SRCINFO` updates ship in this repository; there is no AUR publication
workflow. Check the AUR registry before claiming an AUR release.

## Mobile Store Distribution

Read `apps/mobile/AGENTS.md`, `apps/mobile/app.json`,
`apps/mobile/app.config.ts`, `apps/mobile/eas.json`, the EAS build hook, and the
current `mobile_ci.yaml`. Use Expo's store-distribution skill when available and
verify commands against the installed EAS CLI and current official docs:

- https://docs.expo.dev/submit/ios/
- https://docs.expo.dev/submit/android/
- https://docs.expo.dev/submit/eas-json/
- https://docs.expo.dev/build-reference/app-versions/

### Identity, versions, and credentials

Run EAS commands from `apps/mobile` with `APP_VARIANT=stable`. Use the repository's
`stable` profile, not an assumed `production` profile. Pin and record the EAS CLI
version used for the release. Verify the signed-in account and project before
building or submitting. Current repository identities are:

- Project: `@john_fastrepl/anarlog-mobile`, ID `fcaa4e46-0da5-4dfc-a9e2-6447de0030d2`
- iOS bundle ID and Android package: `so.anarlog.mobile`
- App Store Connect app ID: `6807350358`
- EAS build environment: `production`; app variant: `stable`

Re-read these values rather than treating this list as authority if configuration
changes. Never access an environment whose name matches `*-char`.

The mobile marketing version comes from `apps/mobile/app.json`; do not copy the
desktop version into it. `appVersionSource: remote` and `autoIncrement: true`
manage iOS build numbers and Android version codes. Check remote build history
and store versions before selecting a build. Merge intentional version/profile
changes before freezing the candidate.

Confirm signing and submission credential availability without printing secrets.
Use credentials already managed by EAS where possible. Google Play submission
requires the correct app record and a service account with access to its testing
track. Do not commit credential files or broaden account permissions to bypass a
failed submission.

### Native verification and candidate builds

Dispatch `mobile_ci.yaml` from `main` and verify its run SHA matches the mobile
candidate. Wait for `mobile_checks`, `ios_build`, `android_build`, `watchos_build`,
and the aggregate job; pull-request runs skip native builds.

- iOS dispatch rebuilds the CloudSync framework, runs `test-ios.sh` on a
  simulator, builds Release, and verifies embedded CloudSync and App Shortcuts.
- Android dispatch rebuilds all shipped CloudSync ABIs, builds Release, and
  checks the packaged libraries for the request-deadline patch marker. The
  current workflow does not execute the native CloudSync cancellation suite on
  Android. Report this coverage gap; a marker check is not a passing runtime test.
- Record the `cloudsync-ios-<sha>` and `cloudsync-android-<sha>` artifacts and all
  job results. Never report desktop tests as native mobile coverage.

Build from a clean checkout of the merged candidate, including Git LFS objects
and submodules. Do not upload a combined GitButler workspace or use `EAS_NO_VCS`
to hide source identity. If using an exported source archive, record its origin
SHA and hash and verify that no local changes entered it. The EAS post-install
hook must generate the native bridge before packaging. EAS builds use the
candidate's committed CloudSync bundle; a separate CI rebuild alone does not
prove which bytes are embedded in a signed store artifact.

For an exported source tree, resolve both `EAS_PROJECT_ROOT` and `apps/mobile`
to their physical paths before invoking EAS. Confirm their relative path is
exactly `apps/mobile`. On macOS, mixing `/tmp` with its physical `/private/tmp`
path produces an invalid project directory in the remote build job. Check the
job's `projectRootDirectory` before accepting a build.

```bash
APP_VARIANT=stable eas build --platform ios --profile stable --non-interactive --no-wait
APP_VARIANT=stable eas build --platform android --profile stable --non-interactive --no-wait
APP_VARIANT=stable eas build:view <build-id> --json
```

Record each build ID, source SHA, profile, app version, build number/version
code, status, artifact URL, and SHA-256. Verify an iOS device archive and Android
AAB, not a simulator build or development APK. Inspect packaged identity,
CloudSync inclusion, and signing metadata before submission. Never select
`--latest` when concurrent builds can select a different candidate.

### TestFlight and Google Play internal testing

Use the explicit completed build IDs:

```bash
APP_VARIANT=stable eas submit --platform ios --profile stable --id <ios-build-id> --non-interactive --no-auto-testflight-setup --wait
APP_VARIANT=stable eas submit --platform android --profile stable --id <android-build-id> --non-interactive --wait
```

For Google Play internal testing, require the selected submission profile to
specify `android.track: internal`. A `completed` release makes the build
available on that track; `draft` uploads it without completing rollout. Do not
silently switch to `production`. An EAS `distribution: internal` build is a
separate sideloading mechanism and is not Play internal testing.

Follow the returned submission URLs to terminal status. For iOS, verify Apple
processing completes and the exact version/build appears in TestFlight; check
availability to the intended existing tester group. External TestFlight testing
can require Beta App Review. For Android, verify the exact version code on the
internal track and the release status. Report missing credentials, app setup,
store processing, or tester-group access as concrete pending steps.

Current EAS Submit enables automatic TestFlight setup by default, which can
create a group and invite every App Store Connect admin. Keep
`--no-auto-testflight-setup` unless those invitations were explicitly requested.
An upload request alone does not authorize inviting additional testers.

### Public App Store and Google Play releases

Run only when public distribution was requested. EAS iOS submission uploads to
App Store Connect/TestFlight; public distribution additionally requires selecting
the build for an App Store version, completing metadata and review requirements,
submitting for review, and verifying the approved release becomes available.
Google Play public distribution requires an explicitly selected production
profile or promotion of the verified internal build, with the requested rollout
fraction and release status. Keep store review and public availability distinct
from a successful upload. Never accept new legal agreements on the user's behalf.

## Final Checks

Before reporting success, capture:

- explicit stable version and candidate SHA
- dry-run workflow URL and head SHA
- publish workflow URL and head SHA
- `desktop_v<version>` tag
- GitHub release URL
- whether CrabNebula publish completed
- changelog URL
- stable DMG SHA-256
- Microsoft Store submission/certification state and Linux package publication state
- mobile version, build IDs/numbers, candidate SHA, artifact hashes, submission
  URLs, TestFlight processing/tester availability, and Google Play track/version
  code when mobile distribution was requested
- pending store reviews, native coverage gaps, or unavailable checks, separately
  from completed publication

If the workflow fails, inspect the failed job logs with:

```bash
gh run view <run-id> --log-failed
```
