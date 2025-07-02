import { type Template } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { Trans, useLingui } from "@lingui/react/macro";
import { CopyIcon, EditIcon, MoreHorizontalIcon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { SectionsList } from "../components/template-sections";

interface TemplateEditorProps {
  disabled: boolean;
  template: Template;
  onTemplateUpdate: (template: Template) => void;
  onDelete?: () => void;
  isCreator?: boolean;
}

const EMOJI_OPTIONS = [
  "📄", "📝", "💼", "🤝", "👔", "🌃", "📋", "💡",
  "🎯", "📊", "🔍", "💭", "📈", "🚀", "⭐", "🎨", 
  "🔧", "📱", "💻", "📞", "✅", "❓", "💰", "🎪",
  "🌟", "🎓", "🎉", "🔔", "📌", "🎁", "🌈", "🎭",
  "🏆", "💎", "🔮", "⚡", "🌍", "🎵", "🎬", "🎮"
];

export default function TemplateEditor({
  disabled,
  template,
  onTemplateUpdate,
  onDelete,
  isCreator = true,
}: TemplateEditorProps) {
  const { t } = useLingui();

  console.log("now in template editor")
  console.log("template: ", template);
  
  
  // Extract emoji from title or use default
  const extractEmojiFromTitle = (title: string) => {
    const emojiMatch = title.match(/^(\p{Emoji})\s*/u);
    return emojiMatch ? emojiMatch[1] : "📄";
  };
  
  const getTitleWithoutEmoji = (title: string) => {
    return title.replace(/^(\p{Emoji})\s*/u, '');
  };
  
  const [selectedEmoji, setSelectedEmoji] = useState(() => 
    extractEmojiFromTitle(template.title || "")
  );

  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);

  const handleChangeTitle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const titleWithoutEmoji = e.target.value;
      const fullTitle = selectedEmoji + " " + titleWithoutEmoji;
      onTemplateUpdate({ ...template, title: fullTitle });
    },
    [onTemplateUpdate, template, selectedEmoji],
  );

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      setSelectedEmoji(emoji);
      const titleWithoutEmoji = getTitleWithoutEmoji(template.title || "");
      const fullTitle = emoji + " " + titleWithoutEmoji;
      onTemplateUpdate({ ...template, title: fullTitle });
      setEmojiPopoverOpen(false);
    },
    [onTemplateUpdate, template],
  );

  const handleChangeDescription = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onTemplateUpdate({ ...template, description: e.target.value });
    },
    [onTemplateUpdate, template],
  );

  const handleChangeSections = useCallback(
    (sections: Template["sections"]) => {
      onTemplateUpdate({ ...template, sections });
    },
    [onTemplateUpdate, template],
  );

  const handleDuplicate = useCallback(() => {
    // TODO: Implement duplicate functionality
  }, []);

  const handleDelete = useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            {/* Emoji Selector */}
            <Popover open={emojiPopoverOpen} onOpenChange={setEmojiPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
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

            {/* Title Input */}
            <Input
              disabled={disabled}
              value={getTitleWithoutEmoji(template.title || "")}
              onChange={handleChangeTitle}
              className="rounded-none border-0 p-0 !text-lg font-semibold focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
              placeholder={t`Untitled Template`}
            />
          </div>

          {/* Menu Button */}
          {isCreator
            ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDuplicate} className="cursor-pointer">
                    <CopyIcon className="mr-2 h-4 w-4" />
                    <Trans>Duplicate</Trans>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete} 
                    className="text-destructive hover:bg-red-100 hover:text-red-600 cursor-pointer"
                  >
                    <TrashIcon className="mr-2 h-4 w-4" />
                    <Trans>Delete</Trans>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
            : (
              <button
                onClick={handleDuplicate}
                className="rounded-md p-2 hover:bg-neutral-100"
              >
                <EditIcon className="h-4 w-4" />
              </button>
            )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">
          <Trans>Description</Trans>
        </h2>
        <Textarea
          disabled={disabled}
          value={template.description}
          onChange={handleChangeDescription}
          placeholder={t`Add a description...`}
          className="h-20 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">
          <Trans>Sections</Trans>
        </h2>
        <SectionsList
          disabled={disabled}
          items={template.sections}
          onChange={handleChangeSections}
        />
      </div>
    </div>
  );
}
