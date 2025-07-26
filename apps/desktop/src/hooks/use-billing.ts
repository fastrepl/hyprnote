import { useMutation, useQuery } from "@tanstack/react-query";

const SERVER_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8082"
  : "https://server.hyprnote.com";

export function useBilling({
  stripe_customer_id,
  stripe_subscription_id,
}: {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
} = {}) {
  const checkout = useMutation({
    mutationFn: async ({ email, interval }: { email: string; interval: "monthly" | "yearly" }) => {
      const response = await fetch(`${SERVER_BASE_URL}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: "hyprnote_pro",
          email,
          interval,
        }),
      });

      if (!response.ok) {
        throw new Error(`failed_to_start_checkout: ${response.statusText}`);
      }

      const data = await response.json() as { url: string | null };
      if (!data.url) {
        throw new Error(`failed_to_retrieve_checkout: ${response.statusText}`);
      }

      return data as { url: string };
    },
    onError: console.error,
  });

  const info = useQuery({
    enabled: !!stripe_customer_id && !!stripe_subscription_id,
    queryKey: ["billing", stripe_customer_id, stripe_subscription_id],
    queryFn: async () => {
      const response = await fetch(`${SERVER_BASE_URL}/info/${stripe_customer_id}/${stripe_subscription_id}`, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });
      return response.json();
    },
    refetchInterval: 1000 * 30,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const portal = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${SERVER_BASE_URL}/portal`, {
        method: "POST",
        headers: { "Accept": "application/json" },
      });
      return response.json() as Promise<{ url: string }>;
    },
    onError: console.error,
    onSuccess: ({ url }) => {
      window.open(url, "_blank");
    },
  });

  return { info, portal, checkout };
}
