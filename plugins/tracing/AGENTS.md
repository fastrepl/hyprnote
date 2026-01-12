## Log Location

Logs are stored in the XDG state directory at `$XDG_STATE_HOME/hyprnote/logs/` (defaults to `~/.local/state/hyprnote/logs/` on Linux).

## Log Files

The plugin uses file rotation with the following configuration:
- Base file: `log`
- Rotated files: `log.1`, `log.2`, `log.3`, `log.4`, `log.5`
- Max file size: 10MB per file
- Max files: 6 total (1 active + 5 rotated)

When `log` reaches 10MB, it rotates to `log.1`, and existing rotated files shift up (e.g., `log.1` becomes `log.2`). The oldest file (`log.5`) is deleted.

## Log Format

Each log line follows the tracing-subscriber format:

```
2024-01-15T10:30:45.123456Z  INFO module::path: message key=value
```

Fields:
- Timestamp (ISO 8601 with microseconds)
- Level (TRACE, DEBUG, INFO, WARN, ERROR)
- Module path (Rust module where the log originated)
- Message and structured key-value pairs

## Log Levels

- `ERROR` / `WARN`: Sent to Sentry as events
- `INFO`: Sent to Sentry as breadcrumbs
- `DEBUG` / `TRACE`: Local only (not sent to Sentry)

Set `RUST_LOG` environment variable to control log level (e.g., `RUST_LOG=debug`).

## Frontend Logs

Console methods (`console.log`, `console.error`, etc.) are automatically forwarded to the tracing system, appearing in log files with their corresponding level.
