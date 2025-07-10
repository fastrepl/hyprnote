import { Label } from "@hypr/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";

import { useFieldContext } from "src/lib/form";

type Props<TType extends "string" | "number" = "string"> = {
  label: string;
  options: { value: TType extends "string" ? string : number; label: string }[];
  type: TType;
  required?: boolean;
};

export const SelectField = <TType extends "string" | "number" = "string">({
  label,
  options,
  required,
  type,
}: Props<TType>) => {
  const field = useFieldContext<string | number>();

  return (
    <Label htmlFor={field.name}>
      {label}
      {required ? " *" : ""}
      <Select
        value={field.state.value?.toString() ?? ""}
        onValueChange={(value) => {
          field.handleChange(type === "number" ? Number(value) : value);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={`Select a ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={`${option.value}`}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Label>
  );
};
