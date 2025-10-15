import { forwardRef, useEffect, useState } from "react";

export const CurrentTimeIndicator = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="px-3 py-2" aria-hidden>
    <div className="h-px bg-red-500" />
  </div>
));

export function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const update = () => setNow(new Date());
    update();

    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return now;
}
