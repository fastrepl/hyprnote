import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") as string, {
  apiVersion: "2025-09-30.clover",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (request) => {
  const _supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SECRET_KEY") ?? "",
  );

  const signature = request.headers.get("Stripe-Signature");

  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const body = await request.text();
  let receivedEvent;

  try {
    receivedEvent = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET")!,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(errorMessage, { status: 400 });
  }

  console.log(`[STRIPE WEBHOOK] Event received: ${receivedEvent.id}`);

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
