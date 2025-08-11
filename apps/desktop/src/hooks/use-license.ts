import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as keygen from "tauri-plugin-keygen-api";

const LICENSE_QUERY_KEY = ["license"] as const;
const LICENSE_TTL_SECONDS = 60 * 60 * 24 * 7;
const REFRESH_THRESHOLD_DAYS = 3;

export function useLicense() {
  const queryClient = useQueryClient();

  const getLicense = useQuery({
    queryKey: LICENSE_QUERY_KEY,
    queryFn: async () => {
      const license = await keygen.getLicense();
      if (license?.valid) {
        return license;
      }
      return null;
    },
    refetchInterval: 1000 * 60 * 5,
    refetchIntervalInBackground: true,
  });

  const refreshLicense = useMutation({
    mutationFn: async () => {
      const cachedKey = await keygen.getLicenseKey();
      if (!cachedKey) {
        throw new Error("no_license_key_found");
      }

      const license = await keygen.validateCheckoutKey({
        key: cachedKey,
        entitlements: [],
        ttlSeconds: LICENSE_TTL_SECONDS,
        ttlForever: false,
      });

      return license;
    },
    onError: (e) => {
      console.error(e);
      queryClient.setQueryData(LICENSE_QUERY_KEY, null);
    },
    onSuccess: (license) => {
      queryClient.setQueryData(LICENSE_QUERY_KEY, license);
    },
  });

  const getLicenseStatus = () => {
    const license = getLicense.data;
    if (!license?.valid || !license.expiry) {
      return { needsRefresh: false, isValid: false };
    }

    const now = Date.now();
    const expiryTime = new Date(license.expiry).getTime();
    const daysUntilExpiry = Math.floor((expiryTime - now) / (1000 * 60 * 60 * 24));

    return {
      needsRefresh: daysUntilExpiry <= REFRESH_THRESHOLD_DAYS && daysUntilExpiry > 0,
      isValid: expiryTime > now,
    };
  };

  const activateLicense = useMutation({
    mutationFn: async (key: string) => {
      const license = await keygen.validateCheckoutKey({
        key,
        entitlements: [],
        ttlSeconds: LICENSE_TTL_SECONDS,
        ttlForever: false,
      });
      return license;
    },
    onError: console.error,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LICENSE_QUERY_KEY });
    },
  });

  const deactivateLicense = useMutation({
    mutationFn: async () => {
      await Promise.all([
        keygen.resetLicense(),
        keygen.resetLicenseKey(),
      ]);
      return null;
    },
    onError: console.error,
    onSuccess: () => {
      queryClient.setQueryData(LICENSE_QUERY_KEY, null);
    },
  });

  return {
    getLicense,
    activateLicense,
    deactivateLicense,
    getLicenseStatus,
    refreshLicense,
  };
}
