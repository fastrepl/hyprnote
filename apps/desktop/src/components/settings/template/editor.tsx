import { useForm } from "@tanstack/react-form";
import { ArrowLeft, GripVertical, Plus, X } from "lucide-react";
import { Reorder } from "motion/react";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import * as persisted from "../../../store/tinybase/persisted";

function formatError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return JSON.stringify(error);
}

export function TemplateEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const templateRow = persisted.UI.useRow("templates", id, persisted.STORE_ID);

  const setTemplate = persisted.UI.useSetPartialRowCallback(
    "templates",
    id,
    (row: Partial<persisted.Template>) => ({
      ...row,
      sections: row.sections ? JSON.stringify(row.sections) : undefined,
    } satisfies Partial<persisted.TemplateStorage>),
    [id],
    persisted.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      title: templateRow?.title || "",
      description: templateRow?.description || "",
      sections: templateRow?.sections ? JSON.parse(templateRow.sections as string) : [],
    },
    onSubmit: async ({ value }) => {
      setTemplate(value);
      onClose();
    },
    validators: {
      onChange: persisted.templateSchema.omit({ created_at: true, user_id: true }),
    },
  });

  return (
    <div className="p-6 space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        {/* Header with back button */}
        <div className="flex items-center justify-between border-b pb-4">
          <Button
            type="submit"
            variant="ghost"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Save and close
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-red-500 hover:bg-red-50"
            onClick={() => console.log("Delete template:", id)}
          >
            Delete
          </Button>
        </div>

        {/* Title Input */}
        <form.Field name="title">
          {(field) => (
            <div className="flex flex-col gap-2">
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="text-lg font-semibold border-none p-0 focus-visible:ring-0"
                placeholder="Untitled Template"
              />
              {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                <p className="text-destructive text-xs">
                  {formatError(field.state.meta.errors[0])}
                </p>
              )}
            </div>
          )}
        </form.Field>

        {/* System Instruction */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium">System Instruction</h2>
          <form.Field name="description">
            {(field) => (
              <div className="space-y-2">
                <Textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={`Describe the summary you want to generate...
  
  • what kind of meeting is this?
  • any format requirements?
  • what should AI remember when summarizing?`}
                  className="min-h-48 resize-none"
                />
                {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                  <p className="text-destructive text-xs">
                    {formatError(field.state.meta.errors[0])}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Sections */}
        <form.Field name="sections" mode="array">
          {(field) => (
            <div className="space-y-2">
              <h2 className="text-sm font-medium">Sections</h2>
              <Reorder.Group
                values={field.state.value}
                onReorder={(reorderedSections) => field.handleChange(reorderedSections)}
                className="space-y-2"
              >
                {field.state.value.map((_: persisted.TemplateSection, i: number) => (
                  <Reorder.Item key={i} value={field.state.value[i]}>
                    <div className="group relative rounded-md border border-border bg-card p-2 transition-all">
                      <button
                        type="button"
                        className="absolute left-2 top-2 cursor-move opacity-30 hover:opacity-60 transition-opacity"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </button>

                      <button
                        type="button"
                        className="absolute right-2 top-2 opacity-30 hover:opacity-100 hover:text-red-500 transition-all"
                        onClick={() =>
                          field.removeValue(i)}
                      >
                        <X className="h-3 w-3" />
                      </button>

                      <div className="ml-5 mr-5 space-y-1">
                        <form.Field name={`sections.${i}.title` as const}>
                          {(subField) => (
                            <div>
                              <Input
                                value={(subField.state.value ?? "") as string}
                                onChange={(e) => subField.handleChange(e.target.value)}
                                placeholder="Enter a section title"
                                className="border-0 bg-transparent p-0 text-base font-medium focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                              />
                              {subField.state.meta.errors && subField.state.meta.errors.length > 0 && (
                                <p className="text-destructive text-xs mt-1">
                                  {formatError(subField.state.meta.errors[0])}
                                </p>
                              )}
                            </div>
                          )}
                        </form.Field>
                        <form.Field name={`sections.${i}.description` as const}>
                          {(subField) => (
                            <div>
                              <Textarea
                                value={(subField.state.value ?? "") as string}
                                onChange={(e) => subField.handleChange(e.target.value)}
                                placeholder="Describe the content and purpose of this section"
                                className="min-h-[30px] resize-none border-0 bg-transparent p-0 text-sm text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                              />
                              {subField.state.meta.errors && subField.state.meta.errors.length > 0 && (
                                <p className="text-destructive text-xs mt-1">
                                  {formatError(subField.state.meta.errors[0])}
                                </p>
                              )}
                            </div>
                          )}
                        </form.Field>
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => field.pushValue({ title: "", description: "" })}
                className="w-full mt-2 text-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </div>
          )}
        </form.Field>
      </form>
    </div>
  );
}
