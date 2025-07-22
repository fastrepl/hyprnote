import { useMutation, useQuery } from "@tanstack/react-query";
import * as keygen from "tauri-plugin-keygen-api";

// https://github.com/bagindo/tauri-plugin-keygen
export function useLicense() {
  const getLicense = useQuery({
    queryKey: ["license"],
    queryFn: async () => {
      const license = await keygen.getLicense();
      if (license?.valid) {
        return license;
      }
      return null;
    },
    refetchInterval: 1000 * 60 * 5,
  });

  const activateLicense = useMutation({
    mutationFn: async (key: string) => {
      await keygen.validateCheckoutKey({
        key,
        entitlements: [],
        ttlSeconds: 60 * 60 * 24 * 7, // 7 days
        ttlForever: false,
      });
    },
    onSuccess: () => {
      getLicense.refetch();
    },
  });

  const deactivateLicense = useMutation({
    mutationFn: async () => {
      await keygen.resetLicense();
    },
    onSuccess: () => {
      getLicense.refetch();
    },
  });

  return {
    getLicense,
    activateLicense,
    deactivateLicense,
  };
}
