import { useState, useEffect } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { PlusIcon, ArrowLeftIcon, Loader2Icon, MoreHorizontalIcon, CopyIcon, TrashIcon, EditIcon } from "lucide-react";
import { type Template } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
import TemplateEditor from "./template";
import { cn } from "@hypr/ui/lib/utils";
import { useHypr } from "@/contexts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type ViewState = "list" | "editor" | "new";

export default function TemplatesView() {
  console.log("templatesview mounted@!")
  const { t } = useLingui();
  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [builtinTemplates, setBuiltinTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useHypr();
  const queryClient = useQueryClient();

  // Load config to get selected template
  const config = useQuery({
    queryKey: ["config", "general"],
    queryFn: async () => {
      const result = await dbCommands.getConfig();
      return result;
    },
  });

  // Mutation to save selected template
  const selectTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!config.data) {
        console.error("Cannot save selected template because config is not loaded");
        return;
      }
      
      await dbCommands.setConfig({
        ...config.data,
        general: {
          ...config.data.general,
          selected_template_id: templateId,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "general"] });
    },
    onError: (error) => {
      console.error("Failed to save selected template:", error);
    },
  });

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const templates = await dbCommands.listTemplates();
      console.log("loaded templates: ", templates);
      console.log(templates) 
      
      // Separate custom and builtin templates
      const custom = templates.filter(t => !t.tags?.includes("builtin"));
      const builtin = templates.filter(t => t.tags?.includes("builtin"));
      
      setCustomTemplates(custom);
      setBuiltinTemplates(builtin);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  // Separate template selection from editing
  const handleTemplateSelect = (template: Template) => {
    // Check if this template is already selected
    if (template.id === selectedTemplateId) {
      // Deselect by setting to null
      selectTemplateMutation.mutate("");
    } else {
      // Select this template
      selectTemplateMutation.mutate(template.id);
    }
  };

  // Handle template editing
  const handleTemplateEdit = (template: Template) => {
    setSelectedTemplate(template);
    setViewState("editor");
  };

  const handleNewTemplate = () => {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: "",
      description: "",
      sections: [],
      tags: [],
    };
    setSelectedTemplate(newTemplate);
    setViewState("new");
  };

  const handleTemplateUpdate = async (updatedTemplate: Template) => {
    try {
      await dbCommands.upsertTemplate(updatedTemplate);
      setSelectedTemplate(updatedTemplate);
      
      // Refresh the list
      await loadTemplates();
    } catch (error) {
      console.error("Failed to save template:", error);
    }
  };

  const handleBackToList = () => {
    setViewState("list");
    setSelectedTemplate(null);
  };

  const handleCloneTemplate = async (template: Template) => {
    try {
      const clonedTemplate: Template = {
        ...template,
        id: crypto.randomUUID(),
        title: `${template.title} Copy`,
        user_id: userId, // FIXED: Use userId from context
      };
      await dbCommands.upsertTemplate(clonedTemplate);
      await loadTemplates();
    } catch (error) {
      console.error("Failed to clone template:", error);
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    try {
      await dbCommands.deleteTemplate(template.id);
      await loadTemplates();
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  // Get currently selected template ID from config
  const selectedTemplateId = config.data?.general.selected_template_id;

  // Add handler for template deletion from editor
  const handleTemplateDeleteFromEditor = async () => {
    if (selectedTemplate) {
      try {
        await dbCommands.deleteTemplate(selectedTemplate.id);
        await loadTemplates();
        handleBackToList(); // Go back to list after deletion
      } catch (error) {
        console.error("Failed to delete template:", error);
      }
    }
  };

  // Show template editor
  if (viewState === "editor" || viewState === "new") {
    return (
      <div>
        <div className="mb-4">
          <Button
            variant="ghost" 
            size="sm"
            onClick={handleBackToList}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        </div>

        {selectedTemplate && (
          <TemplateEditor
            disabled={false}
            template={selectedTemplate}
            onTemplateUpdate={handleTemplateUpdate}
            onDelete={handleTemplateDeleteFromEditor}
            isCreator={true}
          />
        )}
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-32 space-y-2">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          <Trans>Loading templates...</Trans>
        </p>
      </div>
    );
  }

  // Show template list
  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              <Trans>Your Templates</Trans>
            </div>
            <div className="text-sm text-muted-foreground">
              <Trans>Select a template to enhance your meeting notes</Trans>
            </div>
          </div>
          
          <Button 
            onClick={handleNewTemplate} 
            variant="outline" 
            size="sm"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Templates */}
        <div className="space-y-2">
          {customTemplates.length > 0 ? (
            customTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => handleTemplateSelect(template)}
                onEdit={() => handleTemplateEdit(template)}
                onClone={() => handleCloneTemplate(template)}
                onDelete={() => handleDeleteTemplate(template)}
                isSelected={template.id === selectedTemplateId}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-sm text-muted-foreground">
                <Trans>No templates yet</Trans>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                <Trans>Create your first template to get started</Trans>
              </div>
            </div>
          )}
        </div>

        {/* Built-in Templates */}
        {builtinTemplates.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">
              <Trans>Built-in Templates</Trans>
            </div>
            <div className="space-y-2">
              {builtinTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleTemplateSelect(template)}
                  onEdit={() => handleTemplateEdit(template)}
                  onClone={() => handleCloneTemplate(template)}
                  onDelete={() => handleDeleteTemplate(template)}
                  isSelected={template.id === selectedTemplateId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Template Card Component with separate select/edit actions
interface TemplateCardProps {
  template: Template;
  onSelect: () => void;
  onEdit?: () => void;
  onClone?: () => void;
  onDelete?: () => void;
  emoji?: string;
  isSelected?: boolean;
}

function TemplateCard({ template, onSelect, onEdit, onClone, onDelete, emoji, isSelected }: TemplateCardProps) {
  // Function to get emoji based on template title
  const getTemplateEmoji = (title: string) => {
    if (emoji) return emoji;
    
    // ✅ First try to extract emoji from title
    const emojiMatch = title.match(/^(\p{Emoji})/u);
    if (emojiMatch) {
      return emojiMatch[1];
    }
    
    // Fall back to keyword matching if no emoji in title
    const lowercaseTitle = title.toLowerCase();
    if (lowercaseTitle.includes("meeting") || lowercaseTitle.includes("vc")) return "💼";
    if (lowercaseTitle.includes("interview") || lowercaseTitle.includes("job")) return "👔";
    if (lowercaseTitle.includes("all hands") || lowercaseTitle.includes("team")) return "🤝";
    if (lowercaseTitle.includes("standup") || lowercaseTitle.includes("daily")) return "☀️";
    if (lowercaseTitle.includes("project") || lowercaseTitle.includes("planning")) return "📋";
    if (lowercaseTitle.includes("review") || lowercaseTitle.includes("feedback")) return "📝";
    if (lowercaseTitle.includes("brainstorm") || lowercaseTitle.includes("ideas")) return "💡";
    return "📄"; // Default emoji
  };

  // Also update the title display to remove emoji since it's shown separately
  const getTitleWithoutEmoji = (title: string) => {
    return title.replace(/^(\p{Emoji})\s*/u, '');
  };

  const handleCardClick = () => {
    onSelect();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  // Function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  return (
    <div className={cn(
      "p-4 rounded-lg shadow-sm transition-all duration-150 ease-in-out cursor-pointer flex flex-col gap-2",
      isSelected 
        ? "border border-blue-500 ring-2 ring-blue-500 bg-blue-50" 
        : "border border-neutral-200 bg-white hover:border-neutral-300"
    )}
    onClick={handleCardClick}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="text-base group-hover:scale-110 transition-transform duration-200">
            {getTemplateEmoji(template.title || "")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm truncate">
                {truncateText(getTitleWithoutEmoji(template.title || "") || "Untitled Template", 30)}
              </div>
            </div>
            <p className="text-xs font-normal text-neutral-500 mt-1 truncate">
              {template.description 
                ? truncateText(template.description, 50)
                : "Create and customize your meeting notes"
              }
            </p>
          </div>
        </div>
        
        {onEdit && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleEditClick}
            className="ml-2 rounded-lg border-neutral-300 hover:border-neutral-400"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
