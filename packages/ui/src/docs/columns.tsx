import { cn } from "@hypr/utils";

interface ColumnsProps {
  cols?: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export function Columns({ cols = 2, children, className }: ColumnsProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 2 && "grid-cols-1 md:grid-cols-2",
        cols === 3 && "grid-cols-1 md:grid-cols-3",
        cols === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
