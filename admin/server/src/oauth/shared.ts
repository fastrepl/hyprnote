export interface OAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
  tokenType: string;
  meta: Record<string, any>;
}
