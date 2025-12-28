import { createRemoteJWKSet, jwtVerify } from "jose";

export type SupabaseJwtPayload = {
  sub?: string;
  entitlements?: string[];
};

export type JwksVerifier = {
  verify: (token: string) => Promise<SupabaseJwtPayload>;
};

export function createJwksVerifier(supabaseUrl: string): JwksVerifier {
  const jwksUrl = new URL("/auth/v1/.well-known/jwks.json", supabaseUrl);
  const jwks = createRemoteJWKSet(jwksUrl, {
    cacheMaxAge: 600_000,
  });

  return {
    verify: async (token: string) => {
      const { payload } = await jwtVerify<SupabaseJwtPayload>(token, jwks, {
        audience: "authenticated",
        issuer: `${supabaseUrl}/auth/v1`,
      });
      return payload;
    },
  };
}
