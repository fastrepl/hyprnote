# https://docs.stripe.com/billing/subscriptions/webhooks#events
defmodule HyprWeb.StripeWebhookHandler do
  @behaviour Stripe.WebhookHandler
  require Logger

  @impl true
  def handle_event(%Stripe.Event{type: type, data: data})
      when type in ["customer.created", "customer.updated"] do
    %{object: %Stripe.Customer{} = _customer} = data

    :ok
  end

  @impl true
  def handle_event(%Stripe.Event{type: type, data: data})
      when type in [
             "customer.subscription.created",
             "customer.subscription.updated",
             "customer.subscription.deleted"
           ] do
    %{object: %Stripe.Subscription{customer: _id} = _subscription} = data

    :ok
  end

  @impl true
  def handle_event(_event), do: :ok
end
