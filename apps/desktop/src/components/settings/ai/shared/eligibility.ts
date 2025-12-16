export type AIService = "llm" | "stt";

export type EligibilityState =
  | "ok"
  | "blocked"
  | "unavailable"
  | "disabled"
  | "loading";

export type EligibilityReason =
  | { code: "missing_provider" }
  | { code: "missing_model" }
  | { code: "provider_disabled" }
  | { code: "requires_auth" }
  | { code: "requires_entitlement"; entitlement: "pro" }
  | { code: "missing_config"; fields: Array<"base_url" | "api_key"> }
  | { code: "model_not_downloaded"; modelId: string }
  | { code: "server_not_ready"; server: "local_stt"; status?: string }
  | { code: "unsupported_on_platform" };

export type EligibilityAction =
  | { kind: "upgrade_to_pro" }
  | { kind: "sign_in" }
  | { kind: "open_provider_settings"; providerId: string }
  | { kind: "download_model"; modelId: string };

export type EligibilityResult = {
  service: AIService;
  providerId?: string;
  modelId?: string;
  state: EligibilityState;
  reasons: EligibilityReason[];
  actions?: EligibilityAction[];
};

export type ProviderRequirement =
  | { kind: "requires_auth" }
  | { kind: "requires_entitlement"; entitlement: "pro" }
  | { kind: "requires_config"; fields: Array<"base_url" | "api_key"> }
  | { kind: "requires_platform"; platform: "apple_silicon" };

export type BaseProviderDefinition = {
  id: string;
  displayName: string;
  icon: React.ReactNode;
  badge?: string | null;
  baseUrl?: string;
  requirements: ProviderRequirement[];
  disabled?: boolean;
};
