import { useCallback, useState } from "react";
import { z } from "zod";

type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function useValidatedRow<T extends z.ZodObject<any>>(
  schema: T,
  currentRow: Partial<z.infer<T>> | undefined,
  onUpdate: (row: z.infer<T>) => void,
) {
  type Row = z.infer<T>;
  const [errors, setErrors] = useState<FieldErrors<Row>>({});

  const setField = useCallback(
    <K extends keyof Row>(field: K, value: Row[K]) => {
      if (!currentRow) {
        return;
      }

      const nextRow = { ...currentRow, [field]: value };
      const result = schema.safeParse(nextRow);

      if (result.success) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
        onUpdate(result.data);
      } else {
        const fieldError = result.error.issues.find((issue) => issue.path.includes(field as string));
        setErrors((prev) => ({
          ...prev,
          [field]: fieldError?.message ?? "Invalid value",
        }));
      }
    },
    [currentRow, schema, onUpdate],
  );

  const clearError = useCallback((field: keyof Row) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  return { setField, clearError, errors };
}
