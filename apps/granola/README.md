# export-granola

Export your Granola notes and transcripts to local files.

## Installation

### Via npm/npx

Run directly without installing:

```bash
npx export-granola
```

Or install globally:

```bash
npm install -g export-granola
```

### Via shell script (macOS/Linux)

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/fastrepl/hyprnote/releases/latest/download/granola-cli-installer.sh | sh
```

### Via PowerShell (Windows)

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://github.com/fastrepl/hyprnote/releases/latest/download/granola-cli-installer.ps1 | iex"
```

## Usage

### Export Notes

Export notes from Granola API to local markdown files:

```bash
npx export-granola notes --output ./notes
npx export-granola notes --supabase /path/to/supabase.json --output ./notes
```

### Export Transcripts

Export transcripts from local cache to text files:

```bash
npx export-granola transcripts --output ./transcripts
npx export-granola transcripts --cache /path/to/cache-v3.json --output ./transcripts
```

## Options

### Notes Command

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --supabase <PATH>` | Path to supabase.json file | Auto-detected |
| `-o, --output <DIR>` | Output directory for exported notes | `notes` |
| `-t, --timeout <SECONDS>` | Request timeout in seconds | `30` |

### Transcripts Command

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --cache <PATH>` | Path to cache-v3.json file | Auto-detected |
| `-o, --output <DIR>` | Output directory for exported transcripts | `transcripts` |

## Help

Run `npx export-granola --help` for full documentation.
