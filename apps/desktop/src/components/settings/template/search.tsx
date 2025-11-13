import { useForm } from "@tanstack/react-form";
import { Search } from "lucide-react";
import { useEffect } from "react";

import { Input } from "@hypr/ui/components/ui/input";

export function TemplateSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const form = useForm({
    defaultValues: {
      query: value,
    },
    onSubmit: ({ value: submitted }) => {
      onChange(submitted.query);
    },
  });

  useEffect(() => {
    const current = form.getFieldValue("query");
    if (current !== value) {
      form.setFieldValue("query", value);
    }
  }, [form, value]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
      className="relative"
    >
      <Search
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400"
        size={16}
      />
      <form.Field name="query">
        {(field) => (
          <Input
            type="text"
            placeholder="Search templates..."
            value={field.state.value}
            onChange={(event) => {
              const nextValue = event.target.value;
              field.handleChange(nextValue);
              if (nextValue !== value) {
                onChange(nextValue);
              }
            }}
            onBlur={field.handleBlur}
            className="pl-9 shadow-none"
          />
        )}
      </form.Field>
    </form>
  );
}
