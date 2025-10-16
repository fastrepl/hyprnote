import { RegenerateButton } from "./generate";

export function FloatingActionButtonn({
  onRegenerate,
}: {
  onRegenerate: (templateId: string | null) => void;
}) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
      <RegenerateButton onRegenerate={onRegenerate} />
    </div>
  );
}
