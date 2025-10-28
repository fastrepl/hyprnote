import { useForm } from "@tanstack/react-form";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import * as persisted from "../../../store/tinybase/persisted";
import { SectionsList } from "./sections-list";

export function TemplateEditor({ id }: { id: string }) {
  const _value = persisted.UI.useRow("templates", id, persisted.STORE_ID);
  const value = _value
    ? persisted.templateSchema.parse({
      ..._value,
      sections: typeof _value.sections === "string" ? JSON.parse(_value.sections) : _value.sections,
    })
    : undefined;

  const setPartialValues = persisted.UI.useSetPartialValuesCallback(
    (row: Partial<persisted.Template>) => ({
      ...row,
      sections: row.sections ? JSON.stringify(row.sections) : undefined,
    } satisfies Partial<persisted.TemplateStorage>),
    [id],
    persisted.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      title: value?.title ?? "",
      description: value?.description ?? "",
      sections: value?.sections ?? [],
    },
    listeners: {
      onChange: ({ formApi }) => {
        const { form: { errors } } = formApi.getAllErrors();
        if (errors.length > 0) {
          console.log(errors);
        }
        formApi.handleSubmit();
      },
    },
    onSubmit: ({ value }) => {
      setPartialValues(value);
    },
  });

  return (
    <div className="space-y-6">
      <form.Field
        name="title"
        children={(field) => (
          <div>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter template title"
              className="border-0 shadow-none text-lg font-medium px-0 focus-visible:ring-0"
            />
          </div>
        )}
      />

      <form.Field
        name="description"
        children={(field) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Describe the template purpose and usage..."
              className="min-h-[100px] resize-none"
            />
          </div>
        )}
      />

      <form.Field
        name="sections"
        children={(field) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">Sections</label>
            <SectionsList
              disabled={false}
              items={field.state.value}
              onChange={(items) => field.handleChange(items)}
            />
          </div>
        )}
      />

      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          Back
        </Button>
      </div>
    </div>
  );
}
