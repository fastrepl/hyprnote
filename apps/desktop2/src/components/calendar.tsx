import * as persisted from "../tinybase/store/persisted";

export function Calendar() {
  const events = persisted.UI.useSliceIds(persisted.INDEXES.eventsByMonth, persisted.STORE_ID);

  return (
    <div className="flex flex-col h-full">
      <pre>{JSON.stringify(events, null, 2)}</pre>
    </div>
  );
}
