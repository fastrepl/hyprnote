import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { validateKey } from "../keygen.js";

interface KeygenAuthOptions {
  cacheTTL?: number; // Cache TTL in milliseconds (default: 5 minutes)
}

const extractCredentials = (c: any) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const licenseKey = authHeader.substring(7);

  if (!licenseKey) {
    return null;
  }

  return { licenseKey };
};

/**
 * KEygen license validation middleware with caching
 *
 * Usage: app.use('/api/*', keygenAuth())
 */
export const keygenAuth = (options: KeygenAuthOptions = {}) => {
  const { cacheTTL = 5 * 60 * 1000 } = options; // 5 minutes default

  return createMiddleware<{
    Variables: {
      license_id: string;
      licenseKey: string;
    };
  }>(async (c, next) => {
    const credentials = extractCredentials(c);

    if (!credentials) {
      throw new HTTPException(401, {
        message: "Invalid authorization header. Use: Bearer license_id:licenseKey",
      });
    }

    const { licenseKey } = credentials;
    const cacheKey = `keygen:${licenseKey}`;

    // Check cache first
    let isValid = c.var.cacheGet<boolean>(cacheKey);

    if (isValid === undefined) {
      isValid = await validateKey(licenseKey);

      const ttl = isValid ? cacheTTL : cacheTTL / 10;
      c.var.cacheSet(cacheKey, isValid, ttl);
    }

    if (!isValid) {
      throw new HTTPException(403, {
        message: "Invalid or expired license",
      });
    }

    c.set("licenseKey", licenseKey);

    await next();
  });
};
