import type { Session, User } from "@supabase/supabase-js";

export const identityLinkMessages = {
  connected:
    "Sign-in method connected. You can now use it to sign in to this Anarlog account.",
  account_mismatch:
    "Your browser is signed in to a different Anarlog account than your app. Sign in to the account you use in the app before connecting a sign-in method.",
  signed_out: "Sign in again before connecting a sign-in method.",
  unsupported: "Connecting sign-in methods is not available for this account.",
  already_connected:
    "This sign-in method is already connected to your account.",
  identity_already_exists:
    "This sign-in method belongs to another Anarlog account. Contact support to resolve the duplicate accounts and their subscriptions.",
  canceled: "Connection canceled. You can try again when you're ready.",
  expired:
    "This connection request has expired or was replaced. Start again from Connected accounts.",
  unavailable:
    "Connecting sign-in methods is currently unavailable. Please contact support.",
  failed: "We couldn't connect this sign-in method. Please try again.",
} as const;

export type IdentityLinkStatus = keyof typeof identityLinkMessages;

export type PendingIdentityLink = {
  userId: string;
  provider: string;
  state: string;
  createdAt: number;
};

export function identityLinkAccountError(
  user: User | null,
  expectedUserId: string,
) {
  if (!user) return "signed_out";
  if (user.id !== expectedUserId) return "account_mismatch";
  if (user.is_anonymous || user.is_sso_user) return "unsupported";
  return null;
}

export function identityLinkError(code?: string): IdentityLinkStatus {
  if (code === "identity_already_exists") return "identity_already_exists";
  if (code === "access_denied") return "canceled";
  if (code === "manual_linking_disabled") return "unavailable";
  return "failed";
}

export async function completeIdentityLink(input: {
  pending: PendingIdentityLink | null;
  state?: string;
  code?: string;
  error?: string;
  now: number;
  getUser: () => Promise<User | null>;
  exchange: (code: string) => Promise<{
    session: Session | null;
    errorCode?: string;
  }>;
  saveSession: (session: Session) => Promise<boolean>;
}): Promise<IdentityLinkStatus> {
  const { pending } = input;
  if (
    !pending ||
    !input.state ||
    pending.state !== input.state ||
    input.now - pending.createdAt > 15 * 60 * 1000 ||
    input.now < pending.createdAt
  )
    return "expired";

  const accountError = identityLinkAccountError(
    await input.getUser(),
    pending.userId,
  );
  if (accountError) return accountError;
  if (input.error) return identityLinkError(input.error);
  if (!input.code) return "failed";

  const result = await input.exchange(input.code);
  if (!result.session) return identityLinkError(result.errorCode);
  if (result.session.user.id !== pending.userId) return "account_mismatch";
  if (
    !result.session.user.identities?.some(
      (identity) => identity.provider === pending.provider,
    )
  ) {
    return "failed";
  }

  return (await input.saveSession(result.session)) ? "connected" : "failed";
}
