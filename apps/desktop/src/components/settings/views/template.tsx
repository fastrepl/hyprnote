import { TemplateService } from "@/utils/template-service";
import { type Template } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { Trans, useLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useState } from "react";
import { SectionsList } from "../components/template-sections";

interface TemplateEditorProps {
  disabled: boolean;
  template: Template;
  onTemplateUpdate: (template: Template) => void;
  onDelete?: () => void;
  onDuplicate?: (template: Template) => void;
  isCreator?: boolean;
}

const EMOJI_OPTIONS = [
  "📄",
  "📝",
  "💼",
  "🤝",
  "👔",
  "🌃",
  "📋",
  "💡",
  "🎯",
  "📊",
  "🔍",
  "💭",
  "📈",
  "🚀",
  "⭐",
  "🎨",
  "🔧",
  "📱",
  "💻",
  "📞",
  "✅",
  "❓",
  "💰",
  "🎪",
  "🌟",
  "🎓",
  "🎉",
  "🔔",
  "📌",
  "🎁",
  "🌈",
  "🎭",
  "🏆",
  "💎",
  "🔮",
  "⚡",
  "🌍",
  "🎵",
  "🎬",
  "🎮",
];

export default function TemplateEditor({
  disabled,
  template,
  onTemplateUpdate,
  onDelete,
  onDuplicate,
  isCreator = true,
}: TemplateEditorProps) {
  const { t } = useLingui();

  // Check if this is a built-in template
  const isBuiltinTemplate = !TemplateService.canEditTemplate(template.id);
  const isReadOnly = disabled || isBuiltinTemplate;

  console.log("now in template editor");
  console.log("template: ", template);
  console.log("isBuiltinTemplate: ", isBuiltinTemplate);

  // Extract emoji from title or use default
  const extractEmojiFromTitle = (title: string) => {
    const emojiMatch = title.match(/^(\p{Emoji})\s*/u);
    return emojiMatch ? emojiMatch[1] : "📄";
  };

  const getTitleWithoutEmoji = (title: string) => {
    return title.replace(/^(\p{Emoji})\s*/u, "");
  };

  // Local state for both inputs
  const [titleText, setTitleText] = useState(() => getTitleWithoutEmoji(template.title || ""));
  const [descriptionText, setDescriptionText] = useState(template.description || "");
  const [selectedEmoji, setSelectedEmoji] = useState(() => extractEmojiFromTitle(template.title || ""));
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);

  // Sync local state when template ID changes (new template loaded)
  useEffect(() => {
    setTitleText(getTitleWithoutEmoji(template.title || ""));
    setDescriptionText(template.description || "");
    setSelectedEmoji(extractEmojiFromTitle(template.title || ""));
  }, [template.id]);

  // Simple handlers with local state
  const handleChangeTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitleText(newTitle); // Update local state immediately

    const fullTitle = selectedEmoji + " " + newTitle;
    onTemplateUpdate({ ...template, title: fullTitle });
  };

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    const fullTitle = emoji + " " + titleText; // Use local state
    onTemplateUpdate({ ...template, title: fullTitle });
    setEmojiPopoverOpen(false);
  };

  const handleChangeDescription = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setDescriptionText(newDescription); // Update local state immediately

    onTemplateUpdate({ ...template, description: newDescription });
  };

  const handleChangeSections = useCallback(
    (sections: Template["sections"]) => {
      onTemplateUpdate({ ...template, sections });
    },
    [onTemplateUpdate, template],
  );

  const handleDuplicate = useCallback(() => {
    onDuplicate?.(template);
  }, [onDuplicate, template]);

  const handleDelete = useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            {/* Emoji Selector - unchanged */}
            <Popover open={emojiPopoverOpen} onOpenChange={setEmojiPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isReadOnly}
                  className="h-10 w-10 p-0 text-lg hover:bg-neutral-100"
                >
                  {selectedEmoji}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <div className="space-y-2">
                  <h4 className="font-medium text-xs">
                    <Trans>Emoji</Trans>
                  </h4>
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-base hover:bg-muted"
                        onClick={() => handleEmojiSelect(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Input
              disabled={isReadOnly}
              value={titleText}
              onChange={handleChangeTitle}
              className="rounded-none border-0 p-0 !text-lg font-semibold focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
              placeholder={t`Untitled Template`}
            />
          </div>

          {isCreator && (
            <div className="flex gap-2">
              {isBuiltinTemplate
                ? (
                  <Button variant="outline" size="sm" onClick={handleDuplicate}>
                    <Trans>Duplicate</Trans>
                  </Button>
                )
                : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="text-destructive hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  >
                    <Trans>Delete</Trans>
                  </Button>
                )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">
          <Trans>System Instruction</Trans>
        </h2>
        <Textarea
          disabled={isReadOnly}
          value={descriptionText}
          onChange={handleChangeDescription}
          placeholder={t`Describe the summary you want to generate...
            
• what kind of meeting is this?
• any format requirements?
• what should AI remember when summarizing?`}
          className="h-48 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">
          <Trans>Sections</Trans>
        </h2>
        <SectionsList
          disabled={isReadOnly}
          items={template.sections}
          onChange={handleChangeSections}
        />
      </div>
    </div>
  );
}
