import { Link } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { useCell, useSortedRowIds } from "tinybase/ui-react";

import * as hybrid from "../tinybase/store/hybrid";

export function Sidebar() {
  const parentRef = useRef<HTMLDivElement>(null);

  const sessionIds = useSortedRowIds(
    "sessions",
    "createdAt",
    true,
    undefined,
    undefined,
    hybrid.STORE_ID,
  );

  const rowVirtualizer = useVirtualizer({
    count: sessionIds?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
  });

  return (
    <div
      ref={parentRef}
      style={{
        width: "250px",
        height: "100vh",
        overflow: "auto",
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const sessionId = sessionIds?.[virtualItem.index];
          if (!sessionId) {
            return null;
          }

          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <SessionItem sessionId={sessionId} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionItem({ sessionId }: { sessionId: string }) {
  const title = useCell(
    "sessions",
    sessionId,
    "title",
    hybrid.STORE_ID,
  );

  return (
    <Link to="/app/note/$id" params={{ id: sessionId }}>
      <div className="w-[200px] p-4 bg-gray-50 border border-gray-200">
        <strong>{title}</strong>
      </div>
    </Link>
  );
}
