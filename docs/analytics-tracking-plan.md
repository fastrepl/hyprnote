# Analytics Tracking Plan

This document outlines all analytics events tracked in Hyprnote, including their purpose, properties, and implementation status.

## Event Naming Convention

All events follow the pattern: `{object}_{past_tense_verb}` or `{action}_{object}`
- Use snake_case for event names
- Use past tense verbs (e.g., `created`, `deleted`, `started`)
- Keep names concise but descriptive
- Properties use snake_case

## Currently Implemented Events

### Authentication & Account Management

#### `user_signed_in`
**When**: User successfully signs in to their account
**Location**: `apps/desktop/src/auth.tsx:244`
**Properties**: None
**Purpose**: Track successful authentication events

#### `user_signed_out`
**When**: User clicks sign out button
**Location**: `apps/desktop/src/components/settings/general/account.tsx:46`
**Properties**: None
**Purpose**: Track when users end their session

#### `account_skipped`
**When**: User chooses "Proceed without account" on Apple Silicon
**Location**: `apps/desktop/src/components/onboarding/welcome.tsx:55`
**Properties**: None
**Purpose**: Track users who opt for local-only mode

### Monetization

#### `trial_started`
**When**: User successfully starts a Pro trial
**Location**: `apps/desktop/src/components/settings/general/account.tsx:204`
**Properties**:
- `plan`: string - Always "pro"

**Purpose**: Track trial conversions

#### `upgrade_clicked`
**When**: User clicks the upgrade to Pro button
**Location**: `apps/desktop/src/components/settings/general/account.tsx:213`
**Properties**:
- `plan`: string - Always "pro"

**Purpose**: Track upgrade funnel entry point

### Session Management

#### `session_started`
**When**: User starts recording a new session
**Location**: `apps/desktop/src/hooks/useStartListening.ts:42`
**Properties**:
- `has_calendar_event`: boolean - Whether session is linked to calendar event

**Purpose**: Track recording usage patterns

#### `session_deleted`
**When**: User deletes a session (note + recording)
**Location**: `apps/desktop/src/components/main/body/sessions/outer-header/overflow/delete.tsx:20`
**Properties**:
- `includes_recording`: boolean - Whether recording was also deleted

**Purpose**: Track data retention patterns

#### `recording_deleted`
**When**: User deletes only the recording (keeps transcript/notes)
**Location**: `apps/desktop/src/components/main/body/sessions/outer-header/overflow/delete.tsx:55`
**Properties**: None
**Purpose**: Track selective data management

### Content Creation & Editing

#### `note_created`
**When**: User creates a new note
**Location**:
- `apps/desktop/src/components/main/shared.ts:35`
- `apps/desktop/src/components/main/sidebar/timeline/item.tsx:187`

**Properties**:
- `has_event_id`: boolean - Whether note is linked to calendar event

**Purpose**: Track content creation

#### `note_edited`
**When**: User writes content in a note (first edit only)
**Location**: `apps/desktop/src/components/main/body/sessions/note-input/raw.tsx:81`
**Properties**:
- `has_content`: boolean - Always true

**Purpose**: Track active note editing

#### `note_enhanced`
**When**: AI enhances/summarizes a note (auto or manual)
**Location**:
- `apps/desktop/src/hooks/useAutoEnhance.ts:81` (auto)
- `apps/desktop/src/components/main/body/sessions/note-input/header.tsx:254` (template)
- `apps/desktop/src/components/main/body/sessions/note-input/header.tsx:476` (manual)

**Properties**:
- `is_auto`: boolean - Whether enhancement was automatic
- `template_id`: string (optional) - If using a template

**Purpose**: Track AI feature usage

### Data Operations

#### `data_imported`
**When**: User successfully imports data from external source
**Location**: `apps/desktop/src/components/settings/data/import.tsx:38`
**Properties**:
- `source`: string - Source type (e.g., "notion", "roam")

**Purpose**: Track data migration patterns

#### `session_exported`
**When**: User exports a session to file
**Location**:
- `apps/desktop/src/components/main/body/sessions/outer-header/overflow/export-pdf.tsx:106` (PDF)
- `apps/desktop/src/components/main/body/sessions/outer-header/overflow/export-transcript.tsx:62` (VTT)

**Properties**:
- `format`: string - "pdf" or "vtt"
- `has_transcript`: boolean (PDF only) - Whether transcript was included
- `has_enhanced`: boolean (PDF only) - Whether enhanced notes were included
- `word_count`: number (VTT only) - Number of words in transcript

**Purpose**: Track export feature usage and format preferences

#### `file_uploaded`
**When**: User uploads audio or transcript file
**Location**: `apps/desktop/src/components/main/body/sessions/floating/listen.tsx:256,278`
**Properties**:
- `file_type`: string - "audio" or "transcript"
- `token_count`: number (transcript only) - Number of tokens imported

**Purpose**: Track file import feature usage

### Settings & Configuration

#### `settings_changed`
**When**: User modifies app settings
**Location**: `apps/desktop/src/components/settings/general/index.tsx:74`
**Properties**:
- `autostart`: boolean - Start at login setting
- `notification_detect`: boolean - Auto-detect meetings setting
- `save_recordings`: boolean - Save recordings setting
- `telemetry_consent`: boolean - Analytics consent setting

**Purpose**: Track settings preferences and privacy choices

#### `ai_provider_configured`
**When**: User configures an AI provider (API key, base URL)
**Location**: `apps/desktop/src/components/settings/ai/shared/index.tsx:105`
**Properties**:
- `provider`: string - Provider type (e.g., "openai", "anthropic", "local")

**Purpose**: Track AI provider adoption

### Search & Discovery

#### `search_performed`
**When**: User performs a search
**Location**: `apps/desktop/src/contexts/search/ui.tsx:208`
**Properties**: None
**Purpose**: Track search feature usage

#### `tab_opened`
**When**: User opens a new tab
**Location**: `apps/desktop/src/store/zustand/tabs/basic.ts:39,47`
**Properties**:
- `view`: string - Tab type (e.g., "sessions", "templates", "contacts")

**Purpose**: Track feature discovery and navigation patterns

### Communication

#### `message_sent`
**When**: User sends a chat message
**Location**: `apps/desktop/src/components/chat/input.tsx:47`
**Properties**: None
**Purpose**: Track chat feature usage

## Not Yet Implemented (Future Tracking)

### High Priority

#### Collaboration
- `share_link_copied` - When user copies share link
- `person_invited` - When user invites someone to share
- `access_revoked` - When user removes someone's access
- `role_changed` - When user changes viewer/editor role

#### Integrations
- `integration_connected` - When user connects an integration
  - Properties: `integration_name`, `integration_type`
- `integration_disconnected` - When user disconnects
  - Properties: `integration_name`
- `sync_triggered` - When user manually syncs
  - Properties: `integration_name`

#### Templates
- `template_created` - When user creates a custom template
- `template_edited` - When user modifies a template
- `template_deleted` - When user deletes a template
- `template_cloned` - When user duplicates a template

### Medium Priority

#### Onboarding
- `onboarding_step_completed` - Track onboarding progress
  - Properties: `step_name`, `step_number`
- `onboarding_skipped` - When user skips onboarding
  - Properties: `at_step`

#### Error Tracking
- `config_error_encountered` - When user hits config error
  - Properties: `error_type`, `component`
- `import_failed` - When import operation fails
  - Properties: `source`, `error_message`
- `export_failed` - When export operation fails
  - Properties: `format`, `error_message`

#### Feature Discovery
- `keyboard_shortcut_used` - Track shortcut usage
  - Properties: `shortcut_name`, `shortcut_key`
- `feature_tooltip_viewed` - Track help tooltip views
  - Properties: `feature_name`

### Low Priority

#### Sort & Filter
- `results_sorted` - When user changes sort order
  - Properties: `sort_by`, `view_type`
- `results_filtered` - When user applies filters
  - Properties: `filter_type`, `filter_value`

#### Calendar Integration
- `calendar_synced` - When calendar sync completes
  - Properties: `event_count`, `integration_name`
- `calendar_event_selected` - When user selects event for note
  - Properties: `has_existing_note`

## Implementation Guidelines

### Adding New Events

1. **Follow naming convention**: Use `{object}_{past_tense_verb}` format
2. **Import the analytics commands**:
   ```typescript
   import { commands as analyticsCommands } from "@hypr/plugin-analytics";
   ```

3. **Call the event at the right time**:
   ```typescript
   void analyticsCommands.event({
     event: "event_name",
     property_key: property_value,
   });
   ```

4. **Best practices**:
   - Track events in `onSuccess` callbacks when possible
   - Don't add complexity to code for tracking
   - Track the action, not the intent
   - Keep property names consistent across events
   - Use boolean properties for binary choices
   - Use string enums for categorical data
   - Use numbers for counts/amounts

### Privacy Considerations

- Never track PII (names, emails, content)
- Track metadata and usage patterns only
- Respect `telemetry_consent` setting
- Use device fingerprint as `distinct_id`, not user emails
- Anonymous by design

### Testing Events

1. Enable analytics in development mode
2. Trigger the action that should fire the event
3. Check PostHog dashboard for event arrival
4. Verify all properties are correctly set
5. Test edge cases (errors, empty states, etc.)

## Event Properties Reference

### Common Properties

- `plan`: "pro" | "free" - User's current plan
- `provider`: string - AI provider name
- `format`: "pdf" | "vtt" | "json" - Export format
- `source`: string - Import source type
- `is_auto`: boolean - Whether action was automatic
- `has_*`: boolean - Presence indicators

### Property Naming

- Use snake_case
- Use descriptive names
- Prefix existence checks with `has_`
- Use counts with `_count` suffix
- Use timestamps with `_at` suffix

## Metrics & KPIs

### Activation Metrics
- Users who start their first session
- Users who create their first note
- Users who configure AI provider
- Users who perform first search

### Engagement Metrics
- Sessions started per user per week
- Notes created per user per week
- AI enhancements triggered
- Exports performed

### Retention Metrics
- Weekly active users (perform any tracked action)
- Session creation rate over time
- Feature usage diversity (unique events per user)

### Conversion Metrics
- Trial start rate
- Upgrade click-through rate
- Sign-up vs. local-only split

### Feature Adoption
- AI provider configuration rate
- Integration connection rate
- Template creation rate
- Search usage rate

## Related Documentation

- PostHog: https://posthog.com/docs/product-analytics
- Plugin bindings: `plugins/analytics/js/bindings.gen.ts`
- Command reference: `.cursor/commands/add-analytics.md`
