export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all] as const,
  list: (filters?: Record<string, unknown>) => [...sessionKeys.lists(), { filters }] as const,
  details: () => [...sessionKeys.all, "detail"] as const,
  detail: (id: string) => [...sessionKeys.details(), id] as const,
  participants: (sessionId: string) => ["participants", sessionId] as const,
  event: (sessionId: string) => ["event", sessionId] as const,
  search: (query: string) => ["search-sessions", query] as const,
  byHuman: (humanId: string) => [...sessionKeys.lists(), "human", humanId] as const,
  byOrganization: (organizationId: string) => [...sessionKeys.lists(), "organization", organizationId] as const,
  byCalendarEvent: (eventId: string) => ["event-session", eventId] as const,
};

export const eventKeys = {
  all: ["events"] as const,
  upcoming: (entityId: string) => [...eventKeys.all, "upcoming", entityId] as const,
  upcomingByOrganization: (organizationId: string) =>
    [...eventKeys.all, "upcoming", "organization", organizationId] as const,
  withoutSession: (userId: string, sessionId: string) =>
    ["events-in-past-without-assigned-session", userId, sessionId] as const,
  bySession: (sessionId: string) => [...eventKeys.all, sessionId] as const,
};

export const humanKeys = {
  all: ["humans"] as const,
  details: () => [...humanKeys.all, "detail"] as const,
  detail: (id: string) => ["human", id] as const,
  search: (query: string) => ["search-participants", query] as const,
};

export const organizationKeys = {
  all: ["organizations"] as const,
  lists: () => [...organizationKeys.all] as const,
  list: (searchTerm?: string) => [...organizationKeys.lists(), searchTerm] as const,
  details: () => [...organizationKeys.all, "detail"] as const,
  detail: (id: string | null) => ["org", id] as const,
  members: (organizationId: string) => ["org", organizationId, "members"] as const,
};

export const calendarKeys = {
  all: ["calendars"] as const,
  lists: () => [...calendarKeys.all] as const,
  detail: (id: string) => ["calendar", id] as const,
  accessStatus: () => ["settings", "calendarAccess"] as const,
  contactsAccessStatus: () => ["settings", "contactsAccess"] as const,
};

export const flagKeys = {
  all: ["flags"] as const,
  feature: (featureName: string) => [...flagKeys.all, featureName] as const,
};

export const configKeys = {
  all: ["config"] as const,
  general: () => [...configKeys.all, "general"] as const,
  profile: (userId: string) => [...configKeys.all, "profile", userId] as const,
};

export const sttKeys = {
  all: ["local-stt"] as const,
  currentModel: () => [...sttKeys.all, "current-model"] as const,
  supportedModels: () => [...sttKeys.all, "supported-models"] as const,
  modelDownloaded: () => ["check-stt-model-downloaded"] as const,
  modelDownloading: () => ["stt-model-downloading"] as const,
};

export const llmKeys = {
  all: ["llm"] as const,
  connection: () => ["custom-llm-connection"] as const,
  availableModels: () => ["available-llm-models"] as const,
  currentModel: () => ["custom-llm-model"] as const,
  enabled: () => ["custom-llm-enabled"] as const,
};

export const appKeys = {
  version: () => ["appVersion"] as const,
  osType: () => ["osType"] as const,
  inApplicationsFolder: () => ["app-in-applications-folder"] as const,
  checkForUpdate: () => ["check-for-update"] as const,
};

export const notificationKeys = {
  all: ["notification"] as const,
  event: () => [...notificationKeys.all, "event"] as const,
  detect: () => [...notificationKeys.all, "detect"] as const,
};

export const audioKeys = {
  micMuted: () => ["mic-muted"] as const,
  speakerMuted: () => ["speaker-muted"] as const,
  micPermission: () => ["micPermission"] as const,
  systemAudioPermission: () => ["systemAudioPermission"] as const,
};

export const modelKeys = {
  all: ["models"] as const,
  currentSttModel: () => ["current-stt-model"] as const,
  checkModelDownloaded: () => ["check-model-downloaded"] as const,
  llmModelDownloading: () => ["llm-model-downloading"] as const,
};

export const devKeys = {
  showDevtools: () => ["showDevtools"] as const,
};

export const authKeys = {
  userId: () => ["auth-user-id"] as const,
  onboardingSessionId: () => ["onboarding"] as const,
};
