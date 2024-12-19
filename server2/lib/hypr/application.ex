defmodule Hypr.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children =
      [
        HyprWeb.Telemetry,
        Hypr.Repo,
        {DNSCluster, query: Application.get_env(:hypr, :dns_cluster_query) || :ignore},
        {Phoenix.PubSub, name: Hypr.PubSub}
      ] ++ stripe() ++ [HyprWeb.Endpoint]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Hypr.Supervisor]
    Supervisor.start_link(children, opts)
  end

  defp stripe() do
    if Application.get_env(:hypr, :dev_routes, false) and
         Phoenix.Endpoint.server?(:hypr, HyprWeb.Endpoint) do
      [{Hypr.StripeWebhookListener, [forward_to: "http://localhost:4000/webhook/stripe"]}]
    else
      []
    end
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    HyprWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
