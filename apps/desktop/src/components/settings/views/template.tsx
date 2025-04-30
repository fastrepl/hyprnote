import { zodResolver } from "@hookform/resolvers/zod";
import { commands as dbCommands, type Template } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, EditIcon, MoreHorizontalIcon, TrashIcon } from "lucide-react";
import { useCallback, useEffect } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { type Section as TemplateSection, SectionsList } from "../components/template-sections";

const templateSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  title: z.string().min(1, "Title cannot be empty"),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  sections: z.array(
    z.object({
      title: z.string().min(1, "Section title cannot be empty"),
      description: z.string(),
    }),
  ).default([]),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateEditorProps {
  disabled: boolean;
  template: Template;
  isCreator?: boolean;
}

export default function TemplateEditor({
  disabled,
  template,
  isCreator = true,
}: TemplateEditorProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      ...template,
      description: template.description ?? "",
      tags: template.tags ?? [],
      sections: template.sections ?? [],
    },
    mode: "onBlur",
  });

  const { register, handleSubmit, watch, setValue, reset, getValues, formState: { errors, isValid, isDirty } } = form;

  const mutation = useMutation({
    mutationFn: (data: TemplateFormData) => {
      return dbCommands.upsertTemplate(data as Template);
    },
    onSuccess: (savedTemplate) => {
      console.log("Template saved via mutation:", savedTemplate);
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      const resetData = savedTemplate
        ? {
          ...savedTemplate,
          description: savedTemplate.description ?? "",
          tags: savedTemplate.tags ?? [],
          sections: savedTemplate.sections ?? [],
        }
        : getValues();
      reset(resetData, { keepValues: false, keepDirty: false });
    },
    onError: (error) => {
      console.error("Failed to save template:", error);
    },
  });

  useEffect(() => {
    reset({
      ...template,
      description: template.description ?? "",
      tags: template.tags ?? [],
      sections: template.sections ?? [],
    });
  }, [template, reset]);

  const handleChangeSections = useCallback(
    (sections: TemplateSection[]) => {
      setValue("sections", sections, { shouldValidate: true, shouldDirty: true });
    },
    [setValue],
  );

  const handleBlurSave = () => {
    if (isDirty && isValid && !disabled) {
      mutation.mutate(getValues());
    }
  };

  const onSubmit: SubmitHandler<TemplateFormData> = (data) => {
    if (!disabled) {
      mutation.mutate(data);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-4">
        <div className="flex items-center justify-between">
          <Input
            {...register("title")}
            disabled={disabled}
            onBlur={handleBlurSave}
            className="rounded-none border-0 p-0 !text-2xl font-semibold focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder={t`Untitled Template`}
          />
          {errors.title && <span className="text-red-500 text-xs ml-2">{errors.title.message}</span>}

          {isCreator
            ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {}} className="cursor-pointer">
                    <CopyIcon className="mr-2 h-4 w-4" />
                    <Trans>Duplicate</Trans>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}} className="cursor-pointer">
                    <TrashIcon className="mr-2 h-4 w-4" />
                    <Trans>Delete</Trans>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
            : (
              <button
                type="button"
                onClick={() => {}}
                className="rounded-md p-2 hover:bg-neutral-100"
              >
                <EditIcon className="h-4 w-4" />
              </button>
            )}
        </div>

        <div className="text-sm text-muted-foreground">Creator: John</div>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">
          <Trans>Description</Trans>
        </h2>
        <Textarea
          {...register("description")}
          disabled={disabled}
          onBlur={handleBlurSave}
          className="focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder={t`Add a description...`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">
          <Trans>Sections</Trans>
        </h2>
        <SectionsList
          disabled={disabled}
          items={watch("sections") ?? []}
          onChange={handleChangeSections}
        />
        {errors.sections?.message && <span className="text-red-500 text-xs">{errors.sections.message}</span>}
        {Array.isArray(errors.sections) && errors.sections.map((err, index) =>
          err
            ? (
              <span key={index} className="text-red-500 text-xs block">
                Section {index + 1}: {err.title?.message || err.description?.message || "Invalid data"}
              </span>
            )
            : null
        )}
      </div>
    </form>
  );
}
