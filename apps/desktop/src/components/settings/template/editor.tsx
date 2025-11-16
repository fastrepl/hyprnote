import { useForm } from "@tanstack/react-form";

import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";

import * as main from "../../../store/tinybase/main";
import { SectionsList } from "./sections";
import { normalizeTemplatePayload } from "./utils";

export function TemplateEditor({ id }: { id: string }) {
  const row = main.UI.useRow("templates", id, main.STORE_ID);
  const value = row ? normalizeTemplatePayload(row) : undefined;

  const handleUpdate = main.UI.useSetPartialRowCallback(
    "templates",
    id,
    (row: Partial<main.Template>) =>
      ({
        ...row,
        sections: row.sections ? JSON.stringify(row.sections) : undefined,
        targets: row.targets ? JSON.stringify(row.targets) : undefined,
      }) satisfies Partial<main.TemplateStorage>,
    [id],
    main.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      title: value?.title ?? "",
      description: value?.description ?? "",
      sections: value?.sections ?? [],
    },
    listeners: {
      onChange: ({ formApi }) => {
        queueMicrotask(() => {
          const {
            form: { errors },
          } = formApi.getAllErrors();
          if (errors.length === 0) {
            formApi.handleSubmit();
          }
        });
      },
    },
    onSubmit: ({ value }) => {
      handleUpdate(value);
    },
  });

  return (
    <div className="space-y-6">
      <form.Field name="title">
        {(field) => (
          <Input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Enter template title"
            className="border-0 shadow-none text-lg font-medium px-0 focus-visible:ring-0"
          />
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Describe the template purpose and usage..."
              className="min-h-[100px] resize-none shadow-none"
            />
          </div>
        )}
      </form.Field>

      <form.Field name="sections">
        {(field) => (
          <div className="space-y-2">
            <label className="text-sm font-medium">Sections</label>
            <SectionsList
              disabled={false}
              items={field.state.value}
              onChange={(items) => field.handleChange(items)}
            />
          </div>
        )}
      </form.Field>
    </div>
  );
}
