import type { Template } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
import { DEFAULT_TEMPLATES, isDefaultTemplate } from "./default-templates";

export class TemplateService {
  /**
   * Get all templates (hardcoded + database)
   */
  static async getAllTemplates(): Promise<Template[]> {
    try {
      const dbTemplates = await dbCommands.listTemplates();
      
      // Merge hardcoded templates with database templates
      // Filter out any database templates that have the same ID as hardcoded ones
      const filteredDbTemplates = dbTemplates.filter(t => !isDefaultTemplate(t.id));
      
      return [...DEFAULT_TEMPLATES, ...filteredDbTemplates];
    } catch (error) {
      console.error("Failed to load database templates:", error);
      // If database fails, return only hardcoded templates
      return DEFAULT_TEMPLATES;
    }
  }

  /**
   * Get a specific template by ID (checks both hardcoded and database)
   */
  static async getTemplate(templateId: string): Promise<Template | null> {
    // Check hardcoded templates first
    const hardcodedTemplate = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    if (hardcodedTemplate) {
      return hardcodedTemplate;
    }

    // Check database templates
    try {
      const dbTemplates = await dbCommands.listTemplates();
      return dbTemplates.find(t => t.id === templateId) || null;
    } catch (error) {
      console.error("Failed to load database template:", error);
      return null;
    }
  }

  /**
   * Separate templates into categories
   */
  static async getTemplatesByCategory(): Promise<{
    custom: Template[];
    builtin: Template[];
  }> {
    const allTemplates = await this.getAllTemplates();
    
    return {
      custom: allTemplates.filter(t => !t.tags?.includes("builtin")),
      builtin: allTemplates.filter(t => t.tags?.includes("builtin"))
    };
  }

  /**
   * Check if a template can be edited (only custom templates can be edited)
   */
  static canEditTemplate(templateId: string): boolean {
    return !isDefaultTemplate(templateId);
  }

  /**
   * Save a template to the database (only for custom templates)
   */
  static async saveTemplate(template: Template): Promise<Template> {
    if (isDefaultTemplate(template.id)) {
      throw new Error("Cannot save built-in template");
    }
    
    return await dbCommands.upsertTemplate(template);
  }

  /**
   * Delete a template from the database (only for custom templates)
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    if (isDefaultTemplate(templateId)) {
      throw new Error("Cannot delete built-in template");
    }
    
    await dbCommands.deleteTemplate(templateId);
  }
} 