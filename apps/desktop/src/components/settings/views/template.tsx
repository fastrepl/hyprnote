import { TemplateService } from "@/utils/template-service";
import { type Template } from "@hypr/plugin-db";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@hypr/ui/components/ui/command";
import { Input } from "@hypr/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { Trans, useLingui } from "@lingui/react/macro";
import { Plus, X } from "lucide-react";
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

// Placeholder data for tags and participants
const PLACEHOLDER_TAGS = [
  "Meeting",
  "Project A", 
  "Sprint Planning",
  "Client Call",
  "Team Sync",
  "Review",
  "Brainstorming",
  "Decision Making"
];

const PLACEHOLDER_PARTICIPANTS = [
  "John Doe",
  "Jane Smith", 
  "Alex Johnson",
  "Sarah Wilson",
  "Mike Brown",
  "Emily Davis",
  "David Lee",
  "Lisa Chen"
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
  
  // Context selection state
  const [contextType, setContextType] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

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

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">
          <Trans>Context</Trans>
        </h2>
        
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-600">
              <Trans>Refer to notes with</Trans>
            </label>
            <Select
              disabled={isReadOnly}
              value={contextType}
              onValueChange={setContextType}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t`Select context type...`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tags">
                  <Trans>Tags</Trans>
                </SelectItem>
                <SelectItem value="participants">
                  <Trans>Participants</Trans>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Multi-select for tags */}
          {contextType === "tags" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-600">
                <Trans>Select tags</Trans>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-wrap gap-2 min-h-[38px] p-2 border rounded-md">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted"
                    >
                      {tag}
                      {!isReadOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-3 w-3 p-0 hover:bg-transparent ml-0.5"
                          onClick={() => {
                            setSelectedTags(selectedTags.filter((t) => t !== tag));
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      )}
                    </Badge>
                  ))}
                  {selectedTags.length === 0 && (
                    <span className="text-sm text-muted-foreground py-1">
                      <Trans>No tags selected</Trans>
                    </span>
                  )}
                </div>
                {!isReadOnly && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-[38px] w-[38px]"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search tags..." className="h-9" />
                        <CommandEmpty>No tag found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {PLACEHOLDER_TAGS.filter(
                            (tag) => !selectedTags.includes(tag),
                          ).map((tag) => (
                            <CommandItem
                              key={tag}
                              onSelect={() => {
                                if (!selectedTags.includes(tag)) {
                                  setSelectedTags([...selectedTags, tag]);
                                }
                              }}
                            >
                              {tag}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          )}

          {/* Multi-select for participants */}
          {contextType === "participants" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-600">
                <Trans>Select participants</Trans>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-wrap gap-2 min-h-[38px] p-2 border rounded-md">
                  {selectedParticipants.map((participant) => (
                    <Badge
                      key={participant}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted"
                    >
                      {participant}
                      {!isReadOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-3 w-3 p-0 hover:bg-transparent ml-0.5"
                          onClick={() => {
                            setSelectedParticipants(selectedParticipants.filter((p) => p !== participant));
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      )}
                    </Badge>
                  ))}
                  {selectedParticipants.length === 0 && (
                    <span className="text-sm text-muted-foreground py-1">
                      <Trans>No participants selected</Trans>
                    </span>
                  )}
                </div>
                {!isReadOnly && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-[38px] w-[38px]"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search participants..." className="h-9" />
                        <CommandEmpty>No participant found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {PLACEHOLDER_PARTICIPANTS.filter(
                            (participant) => !selectedParticipants.includes(participant),
                          ).map((participant) => (
                            <CommandItem
                              key={participant}
                              onSelect={() => {
                                if (!selectedParticipants.includes(participant)) {
                                  setSelectedParticipants([...selectedParticipants, participant]);
                                }
                              }}
                            >
                              {participant}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          )}
        </div>
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
