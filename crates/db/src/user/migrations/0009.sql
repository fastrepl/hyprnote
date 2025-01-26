CREATE TRIGGER sessions_memo_history_trigger
AFTER
UPDATE
  OF raw_memo_html ON sessions
  WHEN OLD.raw_memo_html IS NOT NULL
  AND NEW.raw_memo_html IS NOT NULL
  AND OLD.raw_memo_html != NEW.raw_memo_html BEGIN
INSERT INTO
  sessions_raw_memo_history (session_id, raw_memo_html, created_at)
VALUES
  (
    NEW.id,
    OLD.raw_memo_html,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  );
END;
