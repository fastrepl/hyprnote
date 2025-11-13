import { Icon } from "@iconify-icon/react";
import { type AnyFieldApi } from "@tanstack/react-form";
import { AlertCircleIcon } from "lucide-react";
import { Streamdown } from "streamdown";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@hypr/ui/components/ui/input-group";
import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/main";

export * from "./model-combobox";

const streamdownComponents = {
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => {
    return (
      <ul className="list-disc pl-6 mb-1 block relative">
        {props.children as React.ReactNode}
      </ul>
    );
  },
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => {
    return (
      <ol className="list-decimal pl-6 mb-1 block relative">
        {props.children as React.ReactNode}
      </ol>
    );
  },
  li: (props: React.HTMLAttributes<HTMLLIElement>) => {
    return <li className="mb-1">{props.children as React.ReactNode}</li>;
  },
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => {
    return <p className="mb-1">{props.children as React.ReactNode}</p>;
  },
} as const;

export function StyledStreamdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <Streamdown
      components={streamdownComponents}
      className={cn(["text-sm mt-1", className])}
    >
      {children}
    </Streamdown>
  );
}

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
  const {
    meta: { errors, isTouched },
  } = field.state;
  const hasError = isTouched && errors && errors.length > 0;
  const errorMessage = hasError
    ? typeof errors[0] === "string"
      ? errors[0]
      : "message" in errors[0]
        ? errors[0].message
        : JSON.stringify(errors[0])
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

export function Banner({ message }: { message: string }) {
  return (
    <div
      className={cn([
        "flex items-center justify-center gap-2 text-center",
        "bg-red-50/70 border-b border-red-200",
        "py-3 px-4 -mx-6 -mt-6",
        "text-sm text-red-700",
      ])}
    >
      <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
      {message}
    </div>
  );
}
