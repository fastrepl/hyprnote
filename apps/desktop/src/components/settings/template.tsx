import { useState } from "react";
import { GripVertical as HandleIcon, XIcon } from "lucide-react";
import { motion, Reorder, useDragControls } from "motion/react";
import { clsx } from "clsx";

import type { Template } from "@/types/tauri";

import { Button } from "@hypr/ui/components/ui/button";
import { Card, CardContent } from "@hypr/ui/components/ui/card";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";

export default function Template() {
  return <SectionsList />;
}

const BUILTIN_TEMPLATES: Omit<Template, "id">[] = [
  {
    title: "Template 1",
    description: "Template 1 description",
    sections: [
      {
        title: "Introduction",
        description: "Introduction to the template",
      },
    ],
  },
];

export function SectionsList() {
  const [sections, setSections] = useState<Section[]>([
    {
      id: "1",
      title: "Introduction",
      content:
        "Include any note-worthy points from the small-talk at the beginning of the",
    },
    {
      id: "2",
      title: "Section title",
      content: "Instructions for Granola...",
    },
  ]);

  const ops = {
    addSection: () => {
      const id = Math.random().toString(36).slice(2);
      setSections((sections) => [
        ...sections,
        {
          id,
          title: "Section title",
          content: "Instructions for Hyprnote",
        },
      ]);
    },
    removeSection: (id: string) => {
      setSections((sections) => sections.filter((s) => s.id !== id));
    },
    updateSection: (id: string, updates: Partial<Section>) => {
      setSections((sections) =>
        sections.map((section) =>
          section.id === id ? { ...section, ...updates } : section,
        ),
      );
    },
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <h1 className="mb-6 text-2xl font-semibold">Sections</h1>
      <Reorder.Group axis="y" values={sections} onReorder={setSections}>
        {sections.map((section) => (
          <SectionItem
            key={section.id}
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

interface Section {
  id: string;
  title: string;
  content: string;
}

interface SectionItemProps {
  section: Section;
  onRemove: (id: string) => void;
  onUpdate: (id: string, data: Partial<Section>) => void;
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
              value={section.content}
              onChange={(e) =>
                onUpdate(section.id, { content: e.target.value })
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
