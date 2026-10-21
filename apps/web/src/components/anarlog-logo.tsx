export function AnarlogLogo({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap font-semibold tracking-tight ${className ?? ""}`}
      role="img"
      aria-label="Abrish AI"
      data-compact={compact ? "true" : undefined}
    >
      <span className="text-xl">Abrish</span>
      <span className="ml-1 text-xl font-normal opacity-70">AI</span>
    </span>
  );
}
