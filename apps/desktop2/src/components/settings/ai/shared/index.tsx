import { Icon } from "@iconify-icon/react";

import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@hypr/ui/components/ui/input-group";
import { type AnyFieldApi } from "@tanstack/react-form";
import * as internal from "../../../../store/tinybase/internal";

export * from "./model-combobox";

export function useProvider(id: string) {
  const providerRow = internal.UI.useRow("ai_providers", id, internal.STORE_ID);
  const setProvider = internal.UI.useSetPartialRowCallback(
    "ai_providers",
    id,
    (row: Partial<internal.AIProvider>) => row,
    [id],
    internal.STORE_ID,
  ) as (row: Partial<internal.AIProvider>) => void;

  const { data } = internal.aiProviderSchema.safeParse(providerRow);
  return [data, setProvider] as const;
}

export function FormField({
  field,
  label,
  icon,
  placeholder,
  type,
  hidden,
}: {
  field: AnyFieldApi;
  label: string;
  icon: string;
  placeholder?: string;
  type?: string;
  hidden?: boolean;
}) {
  const { meta: { errors, isTouched, isDirty } } = field.state;
  const hasError = isDirty && isTouched && errors && errors.length > 0;
  const errorMessage = hasError
    ? (typeof errors[0] === "string" ? errors[0] : (errors[0] as any)?.message || "Invalid value")
    : null;

  return (
    <div className="space-y-2" hidden={hidden}>
      <label className="block text-xs font-medium">{label}</label>
      <InputGroup className="bg-white">
        <InputGroupAddon align="inline-start">
          <InputGroupText>
            <Icon icon={icon} />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          name={field.name}
          type={type}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={hasError}
        />
      </InputGroup>
      {errorMessage && (
        <p className="text-destructive text-xs flex items-center gap-1.5">
          <Icon icon="mdi:alert-circle" className="size-3.5" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
}
