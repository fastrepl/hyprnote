import { useEffect, useState } from "react";
import { GripVertical as HandleIcon, XIcon } from "lucide-react";
import { motion, Reorder, useDragControls } from "motion/react";
import clsx from "clsx";

import type { Template } from "@/types/tauri";

import { Button } from "@hypr/ui/components/ui/button";
import { Card, CardContent } from "@hypr/ui/components/ui/card";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";

interface TemplateProps {
  template: Template;
  onTemplateUpdate: (template: Template) => void;
}

export default function Template({
  template,
  onTemplateUpdate,
}: TemplateProps) {
  const handleUpdateSections = (sections: Template["sections"]) => {
    onTemplateUpdate({ ...template, sections });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Title</h2>
        <Input value={template.title} />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Description</h2>
        <Textarea value={template.description} />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Sections</h2>
        <SectionsList
          sections={template.sections}
          onSectionsUpdate={handleUpdateSections}
        />
      </div>
    </div>
  );
}

interface SectionsListProps {
  sections: Template["sections"];
  onSectionsUpdate: (sections: Template["sections"]) => void;
}

export function SectionsList({
  sections: _sections,
  onSectionsUpdate,
}: SectionsListProps) {
  const [sections, setSections] = useState<
    ({ id: string } & Template["sections"][number])[]
  >([]);

  useEffect(() => {
    setSections(
      _sections.map((section) => ({
        ...section,
        id: Math.random().toString(36),
      })),
    );
  }, [_sections]);

  useEffect(() => {
    if (sections.length > 0) {
      onSectionsUpdate(sections.map(({ id, ...section }) => section));
    }
  }, [sections, onSectionsUpdate]);

  const ops = {
    addSection: () => {
      setSections([
        ...sections,
        { id: Math.random().toString(36), title: "", description: "" },
      ]);
    },
    removeSection: (id: string) => {
      setSections(sections.filter((section) => section.id !== id));
    },
    updateSection: (
      id: string,
      updates: Partial<Template["sections"][number]>,
    ) => {
      setSections(
        sections.map((section) =>
          section.id === id ? { ...section, ...updates } : section,
        ),
      );
    },
  };

  return (
    <div>
      <Reorder.Group axis="y" values={sections} onReorder={setSections}>
        {sections.map((section, i) => (
          <SectionItem
            key={i}
            section={section}
            onUpdate={ops.updateSection}
            onRemove={ops.removeSection}
          />
        ))}
      </Reorder.Group>
      <Button
        variant="outline"
        className="mt-2 w-full"
        onClick={ops.addSection}
      >
        Add Section
      </Button>
    </div>
  );
}

interface SectionItemProps {
  section: { id: string } & Template["sections"][number];
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<Template["sections"][number]>) => void;
}

function SectionItem({ section, onRemove, onUpdate }: SectionItemProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item value={section} dragControls={controls} dragListener={false}>
      <Card className="relative mb-4 touch-none">
        <CardContent className="pt-6">
          <motion.div
            className="absolute left-3 top-1/2 -translate-y-1/2 cursor-move opacity-50 hover:opacity-100"
            onPointerDown={(e) => {
              e.preventDefault();
              controls.start(e);
            }}
          >
            <HandleIcon className="h-5 w-5" />
          </motion.div>
          <div className="pl-8 pr-8">
            <Input
              value={section.title}
              onChange={(e) => onUpdate(section.id, { title: e.target.value })}
              className="mb-2 text-lg font-medium"
              placeholder="Section title"
            />
            <Textarea
              value={section.description}
              onChange={(e) =>
                onUpdate(section.id, { description: e.target.value })
              }
              className="min-h-[60px] resize-none"
              placeholder="Instructions or content..."
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={clsx([
              "absolute right-2 top-1/2 -translate-y-1/2",
              "opacity-50 hover:opacity-100",
            ])}
            onClick={() => onRemove(section.id)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </Reorder.Item>
  );
}
