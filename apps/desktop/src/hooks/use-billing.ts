import { useQuery } from "@tanstack/react-query";

const SERVER_BASE_URL = import.meta.env.DEV
  ? "http://localhost:8082"
  : "https://server.hyprnote.com";

export function useBilling({
  stripe_customer_id,
  stripe_subscription_id,
}: {
  stripe_customer_id: string;
  stripe_subscription_id: string;
}) {
  const info = useQuery({
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

  const portal = async () => {
    const response = await fetch(`${SERVER_BASE_URL}/portal`, {
      method: "POST",
      headers: { "Accept": "application/json" },
    });
    return response.json() as Promise<{ url: string }>;
  };

  return { info, portal };
}
