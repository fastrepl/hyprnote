import { Trans } from "@lingui/react/macro";

import { Warning } from "@anlg/ui/components/icons";

import { useLiveQuery } from "~/db";

const EMPTY_PARKED_COUNTS = { pendingUpdate: 0, tooLarge: 0 };

export function SyncHealthSection() {
  const conflictedNotes = useConflictedNoteCount();
  const parked = useParkedRecordCounts();

  if (
    conflictedNotes === 0 &&
    parked.pendingUpdate === 0 &&
    parked.tooLarge === 0
  ) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
          <Warning className="size-4 text-amber-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium">
            <Trans>Sync health</Trans>
          </h3>
          <ul className="text-muted-foreground mt-1 flex flex-col gap-1 text-xs leading-5">
            {conflictedNotes > 0 && (
              <li>
                {conflictedNotes === 1 ? (
                  <Trans>1 note has a version from another device</Trans>
                ) : (
                  <Trans>
                    {conflictedNotes} notes have a version from another device
                  </Trans>
                )}
              </li>
            )}
            {parked.pendingUpdate > 0 && (
              <li>
                {parked.pendingUpdate === 1 ? (
                  <Trans>1 record is waiting for an app update</Trans>
                ) : (
                  <Trans>
                    {parked.pendingUpdate} records are waiting for an app update
                  </Trans>
                )}
              </li>
            )}
            {parked.tooLarge > 0 && (
              <li>
                {parked.tooLarge === 1 ? (
                  <Trans>1 record is too large to apply</Trans>
                ) : (
                  <Trans>
                    {parked.tooLarge} records are too large to apply
                  </Trans>
                )}
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

function useConflictedNoteCount(): number {
  const { data = 0 } = useLiveQuery<{ note_count: number }, number>({
    sql: `
      SELECT COUNT(DISTINCT row_id) AS note_count
      FROM e2ee_field_conflicts
      WHERE resolved_at IS NULL
        AND (
          (table_name = 'session_documents' AND field_name = 'body')
          OR (table_name = 'sessions' AND field_name = 'title')
        )
    `,
    mapRows: (rows) => rows[0]?.note_count ?? 0,
  });
  return data;
}

function useParkedRecordCounts(): { pendingUpdate: number; tooLarge: number } {
  const { data = EMPTY_PARKED_COUNTS } = useLiveQuery<
    { reason: string; record_count: number },
    { pendingUpdate: number; tooLarge: number }
  >({
    sql: `
      SELECT reason, COUNT(*) AS record_count
      FROM e2ee_parked_records
      GROUP BY reason
    `,
    mapRows: (rows) => {
      let pendingUpdate = 0;
      let tooLarge = 0;
      for (const row of rows) {
        if (row.reason === "too_large") {
          tooLarge += row.record_count;
        } else if (
          row.reason === "unknown_table" ||
          row.reason === "unknown_field"
        ) {
          pendingUpdate += row.record_count;
        }
      }
      return { pendingUpdate, tooLarge };
    },
  });
  return data;
}
