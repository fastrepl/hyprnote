import { useEffect, useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";

import type { ContextItem } from "../../chat/context-item";

function ContextChip({ item }: { item: ContextItem }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="shrink-0 rounded-md bg-neutral-500/10 px-1.5 py-0.5 text-xs text-neutral-600 cursor-default">
          {item.label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 whitespace-pre-wrap">
        {item.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function OverflowChip({ items }: { items: ContextItem[] }) {
  const label = items.map((i) => i.label).join(", ");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="shrink-0 rounded-md bg-neutral-500/10 px-1.5 py-0.5 text-xs text-neutral-400 cursor-default">
          +{items.length}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ContextBar({ items }: { items: ContextItem[] }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);

  useEffect(() => {
    setVisibleCount(items.length);
  }, [items.length]);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner || items.length === 0) return;

    const measure = () => {
      const children = Array.from(inner.children) as HTMLElement[];
      if (children.length === 0) return;

      const containerRight = inner.getBoundingClientRect().right;
      const gap = 6;
      const overflowChipWidth = 40;

      let count = 0;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childRight = child.getBoundingClientRect().right;

        if (i < items.length) {
          const needsOverflow = i < items.length - 1;
          const threshold = needsOverflow
            ? containerRight - overflowChipWidth - gap
            : containerRight;

          if (childRight <= threshold) {
            count++;
          } else {
            break;
          }
        }
      }

      if (count < items.length && count === 0) {
        count = 1;
      }

      setVisibleCount(count);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    measure();

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  const visible = items.slice(0, visibleCount);
  const overflow = items.slice(visibleCount);

  return (
    <div className="mx-3 rounded-t-lg bg-neutral-100">
      <div
        ref={innerRef}
        className="flex items-center gap-1.5 px-2.5 py-2 overflow-hidden"
      >
        {visible.map((item) => (
          <ContextChip key={item.key} item={item} />
        ))}
        {overflow.length > 0 && <OverflowChip items={overflow} />}
      </div>
    </div>
  );
}
