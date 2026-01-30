use specta::TypeCollection;
use specta_zod::{TinyBase, Zod};
use store_types::*;

fn main() {
    let mut types = TypeCollection::default();
    types.register::<Human>();
    types.register::<Event>();
    types.register::<Calendar>();
    types.register::<Organization>();
    types.register::<Session>();
    types.register::<Transcript>();
    types.register::<MappingSessionParticipant>();
    types.register::<Tag>();
    types.register::<MappingTagSession>();
    types.register::<Template>();
    types.register::<TemplateSection>();
    types.register::<ChatGroup>();
    types.register::<ChatMessage>();
    types.register::<ChatShortcut>();
    types.register::<EnhancedNote>();
    types.register::<Prompt>();
    types.register::<Word>();
    types.register::<SpeakerHint>();
    types.register::<General>();

    // Generate Zod schemas
    let zod_output = Zod::new().export(&types).unwrap();

    // Generate TinyBase schemas
    let tinybase_output = TinyBase::new()
        .header("")
        .export(&types)
        .unwrap();

    // Print the complete schema.ts file
    print_schema_file(&zod_output, &tinybase_output);
}

fn print_schema_file(zod_output: &str, tinybase_output: &str) {
    // Header
    println!(
        r#"import type {{ TablesSchema }} from "tinybase/with-schemas";
import {{ z }} from "zod";

import {{ InferTinyBaseSchema, jsonObject, type ToStorageType }} from "./shared";
"#
    );

    // Enum schemas (these need to be defined before they're used)
    println!(
        r#"export const calendarProviderSchema = z.enum(["apple", "google", "outlook"]);
export type CalendarProvider = z.infer<typeof calendarProviderSchema>;
"#
    );

    println!(
        r#"export const participantSourceSchema = z.enum(["manual", "auto", "excluded"]);
export type ParticipantSource = z.infer<typeof participantSourceSchema>;
"#
    );

    // Remove the header from zod_output since we already printed our own
    let zod_without_header = zod_output
        .replace(
            "import { z } from \"zod\";\nimport { jsonObject } from \"./shared\";\n\n",
            "",
        );

    // Print Zod schemas (modified to use enum references where needed)
    let modified_zod = zod_without_header
        // Calendar provider should use the enum
        .replace("provider: z.string()", "provider: calendarProviderSchema")
        // MappingSessionParticipant.source should use participantSourceSchema
        .replace(
            "export const mappingSessionParticipantSchema = z.object({\n  user_id: z.string(),\n  session_id: z.string(),\n  human_id: z.string(),\n  source: z.preprocess((val) => val ?? undefined, z.string().optional()),\n});",
            "export const mappingSessionParticipantSchema = z.object({\n  user_id: z.string(),\n  session_id: z.string(),\n  human_id: z.string(),\n  source: z.preprocess(\n    (val) => val ?? undefined,\n    participantSourceSchema.optional(),\n  ),\n});",
        )
        // Human.pinned should have default false
        .replace(
            "pinned: z.boolean()",
            "pinned: z.preprocess((val) => val ?? false, z.boolean())",
        )
        // Calendar.enabled should have default false
        .replace(
            "enabled: z.boolean()",
            "enabled: z.preprocess((val) => val ?? false, z.boolean())",
        )
        // General booleans should have defaults
        .replace(
            "autostart: z.boolean()",
            "autostart: z.boolean().default(false)",
        )
        .replace(
            "telemetry_consent: z.boolean()",
            "telemetry_consent: z.boolean().default(true)",
        )
        .replace(
            "save_recordings: z.boolean()",
            "save_recordings: z.boolean().default(true)",
        )
        .replace(
            "notification_event: z.boolean()",
            "notification_event: z.boolean().default(true)",
        )
        .replace(
            "notification_detect: z.boolean()",
            "notification_detect: z.boolean().default(true)",
        )
        .replace(
            "respect_dnd: z.boolean()",
            "respect_dnd: z.boolean().default(false)",
        )
        .replace(
            "quit_intercept: z.boolean()",
            "quit_intercept: z.boolean().default(false)",
        )
        .replace(
            "ai_language: z.string()",
            r#"ai_language: z.string().default("en")"#,
        )
        // General arrays should have defaults
        .replace(
            "spoken_languages: jsonObject(z.array(z.string()))",
            r#"spoken_languages: jsonObject(z.array(z.string()).default(["en"]))"#,
        )
        .replace(
            "ignored_platforms: jsonObject(z.array(z.string()))",
            "ignored_platforms: jsonObject(z.array(z.string()).default([]))",
        )
        .replace(
            "ignored_recurring_series: jsonObject(z.array(z.string()))",
            "ignored_recurring_series: jsonObject(z.array(z.string()).default([]))",
        )
        // General optional fields should not use preprocess
        .replace(
            "current_llm_provider: z.preprocess((val) => val ?? undefined, z.string().optional())",
            "current_llm_provider: z.string().optional()",
        )
        .replace(
            "current_llm_model: z.preprocess((val) => val ?? undefined, z.string().optional())",
            "current_llm_model: z.string().optional()",
        )
        .replace(
            "current_stt_provider: z.preprocess((val) => val ?? undefined, z.string().optional())",
            "current_stt_provider: z.string().optional()",
        )
        .replace(
            "current_stt_model: z.preprocess((val) => val ?? undefined, z.string().optional())",
            "current_stt_model: z.string().optional()",
        )
        // Transcript words/speaker_hints should have default "[]"
        .replace(
            "words: z.string()",
            r#"words: z.preprocess((val) => val ?? "[]", z.string())"#,
        )
        .replace(
            "speaker_hints: z.string()",
            r#"speaker_hints: z.preprocess((val) => val ?? "[]", z.string())"#,
        )
        // ChatMessage metadata/parts should use jsonObject(z.any())
        .replace("metadata: z.string()", "metadata: jsonObject(z.any())")
        .replace("parts: z.string()", "parts: jsonObject(z.any())")
        // Word metadata should use jsonObject with record
        .replace(
            "metadata: z.preprocess((val) => val ?? undefined, z.string().optional())",
            "metadata: z.preprocess(\n    (val) => val ?? undefined,\n    jsonObject(z.record(z.string(), z.unknown())).optional(),\n  )",
        )
        // SpeakerHint value should use jsonObject with record
        .replace(
            "value: z.string()",
            "value: jsonObject(z.record(z.string(), z.unknown()))",
        );

    println!("{}", modified_zod);

    // Add providerSpeakerIndexSchema
    println!(
        r#"export const providerSpeakerIndexSchema = z.object({{
  speaker_index: z.number(),
  provider: z.string().optional(),
  channel: z.number().optional(),
}});
"#
    );

    // Add aiProviderSchema
    println!(
        r#"export const aiProviderSchema = z
  .object({{
    type: z.enum(["stt", "llm"]),
    base_url: z.url().min(1),
    api_key: z.string(),
  }})
  .refine(
    (data) => !data.base_url.startsWith("https:") || data.api_key.length > 0,
    {{
      message: "API key is required for HTTPS URLs",
      path: ["api_key"],
    }},
  );
"#
    );

    // Type exports
    println!(
        r#"export type ProviderSpeakerIndexHint = z.infer<
  typeof providerSpeakerIndexSchema
>;

export type Human = z.infer<typeof humanSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Calendar = z.infer<typeof calendarSchema>;
export type CalendarStorage = ToStorageType<typeof calendarSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Transcript = z.infer<typeof transcriptSchema>;
export type Word = z.infer<typeof wordSchema>;
export type SpeakerHint = z.infer<typeof speakerHintSchema>;
export type MappingSessionParticipant = z.infer<
  typeof mappingSessionParticipantSchema
>;
export type Tag = z.infer<typeof tagSchema>;
export type MappingTagSession = z.infer<typeof mappingTagSessionSchema>;
export type Template = z.infer<typeof templateSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export type ChatGroup = z.infer<typeof chatGroupSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatShortcut = z.infer<typeof chatShortcutSchema>;
export type EnhancedNote = z.infer<typeof enhancedNoteSchema>;
export type Prompt = z.infer<typeof promptSchema>;
export type AIProvider = z.infer<typeof aiProviderSchema>;
export type General = z.infer<typeof generalSchema>;

export type SessionStorage = ToStorageType<typeof sessionSchema>;
export type TranscriptStorage = ToStorageType<typeof transcriptSchema>;
export type WordStorage = ToStorageType<typeof wordSchema>;
export type SpeakerHintStorage = ToStorageType<typeof speakerHintSchema>;
export type TemplateStorage = ToStorageType<typeof templateSchema>;
export type ChatMessageStorage = ToStorageType<typeof chatMessageSchema>;
export type EnhancedNoteStorage = ToStorageType<typeof enhancedNoteSchema>;
export type HumanStorage = ToStorageType<typeof humanSchema>;
export type OrganizationStorage = ToStorageType<typeof organizationSchema>;
export type PromptStorage = ToStorageType<typeof promptSchema>;
export type ChatShortcutStorage = ToStorageType<typeof chatShortcutSchema>;
export type EventStorage = ToStorageType<typeof eventSchema>;
export type MappingSessionParticipantStorage = ToStorageType<
  typeof mappingSessionParticipantSchema
>;
export type AIProviderStorage = ToStorageType<typeof aiProviderSchema>;
export type GeneralStorage = ToStorageType<typeof generalSchema>;
"#
    );

    // Generate tableSchemaForTinybase
    println!("export const tableSchemaForTinybase = {{");

    // Parse tinybase_output and reorganize into table format
    let table_schemas = [
        ("sessions", "sessionTinybaseSchema", "sessionSchema"),
        (
            "transcripts",
            "transcriptTinybaseSchema",
            "transcriptSchema",
        ),
        ("words", "wordTinybaseSchema", "wordSchema"),
        (
            "speaker_hints",
            "speaker_hintTinybaseSchema",
            "speakerHintSchema",
        ),
        ("humans", "humanTinybaseSchema", "humanSchema"),
        (
            "organizations",
            "organizationTinybaseSchema",
            "organizationSchema",
        ),
        ("calendars", "calendarTinybaseSchema", "calendarSchema"),
        ("events", "eventTinybaseSchema", "eventSchema"),
        (
            "mapping_session_participant",
            "mapping_session_participantTinybaseSchema",
            "mappingSessionParticipantSchema",
        ),
        ("tags", "tagTinybaseSchema", "tagSchema"),
        (
            "mapping_tag_session",
            "mapping_tag_sessionTinybaseSchema",
            "mappingTagSessionSchema",
        ),
        ("templates", "templateTinybaseSchema", "templateSchema"),
        ("chat_groups", "chat_groupTinybaseSchema", "chatGroupSchema"),
        (
            "chat_messages",
            "chat_messageTinybaseSchema",
            "chatMessageSchema",
        ),
        (
            "enhanced_notes",
            "enhanced_noteTinybaseSchema",
            "enhancedNoteSchema",
        ),
        ("prompts", "promptTinybaseSchema", "promptSchema"),
        (
            "chat_shortcuts",
            "chat_shortcutTinybaseSchema",
            "chatShortcutSchema",
        ),
    ];

    for (table_name, _, zod_schema) in table_schemas.iter() {
        let schema_content = extract_tinybase_schema(tinybase_output, table_name);
        if let Some(content) = schema_content {
            println!(
                "  {}: {{\n{}  }} as const satisfies InferTinyBaseSchema<typeof {}>,",
                table_name, content, zod_schema
            );
        }
    }

    println!("}} as const satisfies TablesSchema;");
    println!();

    // Generate valueSchemaForTinybase (General fields)
    println!(
        r#"export const valueSchemaForTinybase = {{
  user_id: {{ type: "string" }},
  autostart: {{ type: "boolean" }},
  save_recordings: {{ type: "boolean" }},
  notification_event: {{ type: "boolean" }},
  notification_detect: {{ type: "boolean" }},
  respect_dnd: {{ type: "boolean" }},
  quit_intercept: {{ type: "boolean" }},
  telemetry_consent: {{ type: "boolean" }},
  ai_language: {{ type: "string" }},
  spoken_languages: {{ type: "string" }},
  ignored_platforms: {{ type: "string" }},
  ignored_recurring_series: {{ type: "string" }},
  current_llm_provider: {{ type: "string" }},
  current_llm_model: {{ type: "string" }},
  current_stt_provider: {{ type: "string" }},
  current_stt_model: {{ type: "string" }},
}} as const satisfies InferTinyBaseSchema<typeof generalSchema>;
"#
    );
}

fn extract_tinybase_schema(tinybase_output: &str, table_name: &str) -> Option<String> {
    // Map table names to their TinyBase schema variable names
    let var_name = match table_name {
        "sessions" => "sessionTinybaseSchema",
        "transcripts" => "transcriptTinybaseSchema",
        "words" => "wordTinybaseSchema",
        "speaker_hints" => "speaker_hintTinybaseSchema",
        "humans" => "humanTinybaseSchema",
        "organizations" => "organizationTinybaseSchema",
        "calendars" => "calendarTinybaseSchema",
        "events" => "eventTinybaseSchema",
        "mapping_session_participant" => "mapping_session_participantTinybaseSchema",
        "tags" => "tagTinybaseSchema",
        "mapping_tag_session" => "mapping_tag_sessionTinybaseSchema",
        "templates" => "templateTinybaseSchema",
        "chat_groups" => "chat_groupTinybaseSchema",
        "chat_messages" => "chat_messageTinybaseSchema",
        "enhanced_notes" => "enhanced_noteTinybaseSchema",
        "prompts" => "promptTinybaseSchema",
        "chat_shortcuts" => "chat_shortcutTinybaseSchema",
        _ => return None,
    };

    // Find the schema in the output
    let search_pattern = format!("export const {} = {{", var_name);
    if let Some(start_idx) = tinybase_output.find(&search_pattern) {
        let content_start = start_idx + search_pattern.len();
        if let Some(end_idx) = tinybase_output[content_start..].find("};") {
            let content = &tinybase_output[content_start..content_start + end_idx];
            // Reformat the content with proper indentation
            let formatted = content
                .lines()
                .filter(|line| !line.trim().is_empty())
                .map(|line| format!("    {}", line.trim()))
                .collect::<Vec<_>>()
                .join("\n");
            return Some(formatted + "\n");
        }
    }
    None
}
