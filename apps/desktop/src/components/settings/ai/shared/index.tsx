import { Icon } from "@iconify-icon/react";

import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@hypr/ui/components/ui/input-group";
import { type AnyFieldApi } from "@tanstack/react-form";
import * as main from "../../../../store/tinybase/main";

export * from "./model-combobox";

export function useProvider(id: string) {
  const providerRow = main.UI.useRow("ai_providers", id, main.STORE_ID);
  const setProvider = main.UI.useSetPartialRowCallback(
    "ai_providers",
    id,
    (row: Partial<main.AIProvider>) => row,
    [id],
    main.STORE_ID,
  ) as (row: Partial<main.AIProvider>) => void;

  const { data } = main.aiProviderSchema.safeParse(providerRow);
  return [data, setProvider] as const;
}

export function FormField({
  field,
  label,
  icon,
  placeholder,
  type,
}: {
  field: AnyFieldApi;
  label: string;
  icon: string;
  placeholder?: string;
  type?: string;
}) {
  const { meta: { errors, isTouched } } = field.state;
  const hasError = isTouched && errors && errors.length > 0;
  const errorMessage = hasError
    ? (typeof errors[0] === "string"
      ? errors[0]
      : "message" in errors[0]
      ? errors[0].message
      : JSON.stringify(errors[0]))
    : null;

  return (
    <div className="space-y-2">
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
          <Icon icon="mdi:alert-circle" size={14} />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
}
