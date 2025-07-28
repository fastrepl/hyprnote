import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as keygen from "tauri-plugin-keygen-api";

const LICENSE_QUERY_KEY = ["license"] as const;

// https://github.com/bagindo/tauri-plugin-keygen
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
    // This is important for immediate refresh
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
        ttlSeconds: 60 * 60 * 24 * 7, // 7 days
        ttlForever: false,
      });

      return license;
    },
    onError: console.error,
    onSuccess: (license) => {
      queryClient.setQueryData(LICENSE_QUERY_KEY, license);
    },
  });

  const shouldRefresh = () => {
    const license = getLicense.data;
    if (!license || !license.valid) {
      return false;
    }

    if (!license.expiry) {
      throw new Error("license.expiry is null");
    }

    const daysUntilExpiry = Math.floor(
      (new Date(license.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
  };

  const activateLicense = useMutation({
    mutationFn: async (key: string) => {
      const license = await keygen.validateCheckoutKey({
        key,
        entitlements: [],
        ttlSeconds: 60 * 60 * 24 * 7, // 7 days
        ttlForever: false,
      });
      console.log("Activated license", license);
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
      queryClient.invalidateQueries({ queryKey: LICENSE_QUERY_KEY });
    },
  });

  return {
    getLicense,
    activateLicense,
    deactivateLicense,
    shouldRefresh,
    refreshLicense,
  };
}
