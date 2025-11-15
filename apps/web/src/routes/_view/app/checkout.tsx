import { createCheckoutSession } from "@/functions/billing";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const validateSearch = z.object({
  period: z.enum(["monthly", "yearly"]).default("monthly"),
});

export const Route = createFileRoute("/_view/app/checkout")({
  validateSearch,
  beforeLoad: async ({ search }) => {
    const { url } = await createCheckoutSession({
      data: { period: search.period },
    });

    if (url) {
      throw redirect({ href: url });
    }

    throw redirect({ to: "/app/account" });
  },
});
