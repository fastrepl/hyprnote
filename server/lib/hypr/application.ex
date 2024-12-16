defmodule Hypr.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      HyprWeb.Telemetry,
      Hypr.Repo,
      {DNSCluster, query: Application.get_env(:hypr, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Hypr.PubSub},
      # Start a worker by calling: Hypr.Worker.start_link(arg)
      # {Hypr.Worker, arg},
      # Start to serve requests, typically the last entry
      HyprWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Hypr.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    HyprWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
