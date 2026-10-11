# CLI commands

Use `--json` for agent-readable output.

Linux Flatpak installs this command as `anarlog-cli`; use that name instead of `anarlog` in the examples when that is the command on PATH.

Account authentication works on headless systems:

```bash
anarlog auth login
anarlog --json auth status
anarlog auth logout
```

For `auth login`, give the printed URL to the user. They may open it on another device, sign in, choose **Copy URL**, and paste the resulting `anarlog://auth/callback` link into the hidden prompt. Never ask the user to paste that callback link into chat or expose it in command arguments because it contains account tokens.

On Linux, sessions use Secret Service when available and otherwise use the desktop-compatible local auth file with mode `0600`. With `--json`, `auth login` prints the URL to stderr and reads the callback from stdin.

```bash
anarlog --json doctor
anarlog --json meetings list --query "planning" --limit 20 --offset 0
anarlog --json meetings folders --query "clients"
anarlog --json meetings list --folder "Clients/ACME" --limit 20
anarlog --json meetings --source cloud list --query "planning" --limit 20 --offset 0
anarlog --json meetings --source auto get MEETING_ID
anarlog --json meetings get MEETING_ID
anarlog --json meetings note MEETING_ID --kind note
anarlog --json meetings note MEETING_ID --kind summary
anarlog --json meetings history MEETING_ID --limit 20 --offset 0
anarlog --json proposals list --meeting MEETING_ID
anarlog --json proposals create --meeting MEETING_ID --kind summary --content "Replacement markdown"
anarlog --json proposals show PROPOSAL_ID
anarlog --json proposals decline PROPOSAL_ID
```

`proposals create` stages a pending edit. Do not claim the meeting changed. A human applies or declines it in the Anarlog desktop app.

Meeting commands default to `--source local`. `--source cloud` reads hosted snapshots using `anarlog auth login`; `--source auto` uses Cloud only when the local database is absent. Cloud access is read-only, so proposals remain local. Folder listing and `--folder` filtering are local only; meetings include `folder_path`, or `null` outside a folder.

`doctor` exits with status 1 when its response contains `ready: false`.

Read transcripts in bounded word pages:

```bash
anarlog --json meetings transcript MEETING_ID --limit 200 --offset 0
```

JSON success responses contain `schema_version`, `command`, `data`, and optional `pagination`. Continue from `pagination.next_offset` only when more context is necessary.

Export is intended for an explicit user request to save or transfer a complete meeting:

```bash
anarlog meetings export MEETING_ID --format markdown --output meeting.md
anarlog meetings export MEETING_ID --format json --output meeting.json
```

Export refuses to replace an existing file. Pass `--force` only after the user explicitly approves overwriting that exact path.

Markdown exports label transcript paragraphs with speaker names when word-level speaker information is available. Exports without that information retain flat text. JSON exports can include optional `speakers` and `speaker_context` fields.

Global database overrides:

```bash
anarlog --db-path /path/to/app.db --json meetings list
anarlog --base /path/to/anarlog-data --json meetings list
```

### Managed local capture

`anarlog meetings capabilities` reports managed-settings, calendar-identity, recording-attachment, capture-completion, and conditional-delete support without opening a database.

`anarlog meetings delete` permanently removes a completed local meeting, its document history, transcripts, recordings, and derived search index. It requires `--source local`, `--if-export-sha256` (the SHA-256 of the complete JSON export output, including its final newline), and `--require-transcription-complete`. Close the desktop app first. A changed export, unfinished transcript, cloud attachment, or shared record prevents deletion. An interrupted file removal can be resumed with the same meeting ID and hash.

A version 1 `managed_settings.json` beside the active `app.db` contains a `settings` object. Only supported capture settings are accepted, and secrets are rejected. Managed rows override user changes; malformed policy prevents database startup. `intelligence_disabled: true` disables all model connections, including local models. Transcription credentials remain in the OS credential store.

`meetings initialize-managed` (`anarlog --json meetings --source local initialize-managed`) creates or migrates the local database before first desktop launch. An existing `managed_settings.json` that disables intelligence is required; the desktop must be closed. No recording or permission prompt is started.