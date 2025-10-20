import { useCallback, useState } from "react";
import { z } from "zod";

type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function useSafeObjectUpdate<T extends z.ZodObject<any>>(
  schema: T,
  initialData: Partial<z.infer<T>> | undefined,
  onUpdate: (row: z.infer<T>) => void,
): {
  setField: <K extends keyof z.infer<T>>(field: K, value: z.infer<T>[K]) => void;
  errors: FieldErrors<z.infer<T>>;
  isValid: boolean;
  isSaved: boolean;
  data: Partial<z.infer<T>>;
  hasEdits: boolean;
} {
  type Row = z.infer<T>;
  const [errors, setErrors] = useState<FieldErrors<Row>>({});
  const [localEdits, setLocalEdits] = useState<Partial<Row>>({});

  const data = { ...initialData, ...localEdits };
  const result = schema.safeParse(data);
  const isValid = result.success;
  const hasEdits = Object.keys(localEdits).length > 0;
  const isSaved = initialData !== undefined && isValid && !hasEdits;

  const setField = useCallback(
    <K extends keyof Row>(field: K, value: Row[K]) => {
      const nextRow = { ...data, [field]: value };
      const result = schema.safeParse(nextRow);

      setLocalEdits((prev) => ({ ...prev, [field]: value }));

      if (result.success) {
        setErrors({});
        onUpdate(result.data);
      } else {
        const fieldError = result.error.issues.find((issue) => issue.path.includes(field as string));
        if (fieldError) {
          setErrors((prev) => ({
            ...prev,
            [field]: fieldError.message,
          }));
        } else {
          setErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
          });
        }
      }
    },
    [data, schema, onUpdate],
  );

  return {
    setField,
    errors: isValid ? {} : errors,
    isValid,
    isSaved,
    data,
    hasEdits,
  };
}
