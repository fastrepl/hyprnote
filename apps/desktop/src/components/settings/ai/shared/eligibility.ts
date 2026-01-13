import type { Credentials } from "@hypr/store";

export type ConfigField =
  | "base_url"
  | "api_key"
  | "access_key_id"
  | "secret_access_key"
  | "region";

export type ProviderRequirement =
  | { kind: "requires_auth" }
  | { kind: "requires_entitlement"; entitlement: "pro" }
  | { kind: "requires_config"; fields: ConfigField[] }
  | { kind: "requires_platform"; platform: "apple_silicon" };

export function requiresEntitlement(
  requirements: readonly ProviderRequirement[],
  entitlement: "pro",
): boolean {
  return requirements.some(
    (r) => r.kind === "requires_entitlement" && r.entitlement === entitlement,
  );
}

export function requiresConfigField(
  requirements: readonly ProviderRequirement[],
  field: ConfigField,
): boolean {
  return requirements.some(
    (r) => r.kind === "requires_config" && r.fields.includes(field),
  );
}

export function getRequiredConfigFields(
  requirements: readonly ProviderRequirement[],
): ConfigField[] {
  const req = requirements.find((r) => r.kind === "requires_config");
  return req?.kind === "requires_config" ? req.fields : [];
}

export type ProviderEligibilityContext = {
  isAuthenticated: boolean;
  isPro: boolean;
  baseUrl?: string;
  credentials?: Credentials | null;
};

function getConfigValue(
  context: ProviderEligibilityContext,
  field: ConfigField,
): string | undefined {
  const { credentials, baseUrl } = context;
  if (field === "base_url") return baseUrl;
  if (!credentials) return undefined;
  if (credentials.type === "api_key") {
    if (field === "api_key") return credentials.api_key;
    return undefined;
  }
  if (credentials.type === "aws") {
    if (field === "access_key_id") return credentials.access_key_id;
    if (field === "secret_access_key") return credentials.secret_access_key;
    if (field === "region") return credentials.region;
    return undefined;
  }
  return undefined;
}

export function getProviderSelectionBlockers(
  requirements: readonly ProviderRequirement[],
  context: ProviderEligibilityContext,
): EligibilityBlocker[] {
  const blockers: EligibilityBlocker[] = [];

  for (const req of requirements) {
    switch (req.kind) {
      case "requires_auth":
        if (!context.isAuthenticated) {
          blockers.push({ code: "requires_auth" });
        }
        break;
      case "requires_entitlement":
        if (req.entitlement === "pro" && !context.isPro) {
          blockers.push({ code: "requires_entitlement", entitlement: "pro" });
        }
        break;
      case "requires_config": {
        const missingFields = req.fields.filter((field) => {
          const value = getConfigValue(context, field);
          return !value || value.trim() === "";
        });
        if (missingFields.length > 0) {
          blockers.push({ code: "missing_config", fields: missingFields });
        }
        break;
      }
      case "requires_platform":
        break;
    }
  }

  return blockers;
}

export type ModelRequirement =
  | { kind: "requires_download" }
  | { kind: "requires_entitlement"; entitlement: "pro" }
  | { kind: "requires_platform"; platform: "apple_silicon" };

export type EligibilityBlocker =
  | { code: "missing_provider" }
  | { code: "missing_model" }
  | { code: "provider_disabled" }
  | { code: "requires_auth" }
  | { code: "requires_entitlement"; entitlement: "pro" }
  | { code: "missing_config"; fields: ConfigField[] }
  | { code: "model_not_downloaded"; modelId: string }
  | { code: "unsupported_platform"; required: "apple_silicon" };

export type EligibilityAction =
  | { kind: "sign_in" }
  | { kind: "upgrade_to_pro" }
  | { kind: "open_provider_settings"; providerId: string }
  | { kind: "download_model"; modelId: string };

export function getActionForBlocker(
  blocker: EligibilityBlocker,
  providerId?: string,
): EligibilityAction | null {
  switch (blocker.code) {
    case "requires_auth":
      return { kind: "sign_in" };
    case "requires_entitlement":
      return { kind: "upgrade_to_pro" };
    case "missing_config":
      return providerId ? { kind: "open_provider_settings", providerId } : null;
    case "model_not_downloaded":
      return { kind: "download_model", modelId: blocker.modelId };
    default:
      return null;
  }
}
