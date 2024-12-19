defmodule Hypr.StripeWebhookListener do
  use GenServer
  require Logger

  def start_link(options) do
    {stripe_cli, options} = Keyword.pop(options, :stripe_cli, System.find_executable("stripe"))
    {forward_to, options} = Keyword.pop!(options, :forward_to)
    options = Keyword.validate!(options, [:name, :timeout, :debug, :spawn_opt, :hibernate_after])
    GenServer.start_link(__MODULE__, %{stripe_cli: stripe_cli, forward_to: forward_to}, options)
  end

  @impl true
  def init(%{stripe_cli: nil}) do
    Logger.warning("Stripe CLI not found")
    :ignore
  end

  def init(%{stripe_cli: stripe_cli, forward_to: forward_to}) do
    # https://docs.stripe.com/cli/listen
    args = [
      "listen",
      "--skip-verify",
      "--forward-to",
      forward_to
    ]

    port =
      Port.open(
        {:spawn_executable, stripe_cli},
        [
          :binary,
          :stderr_to_stdout,
          line: 2048,
          args: args
        ]
      )

    {:ok, port}
  end

  @impl true
  def handle_info({port, {:data, {:eol, line}}}, port) do
    secret = extract_secret(line)

    if is_nil(secret) do
      Logger.info("stripe: #{line}")
    else
      Application.put_env(:hypr, :stripe_webhook_secret, secret)
    end

    {:noreply, port}
  end

  defp extract_secret(text) do
    case Regex.run(~r/webhook signing secret is (whsec_[a-f0-9]{64})/, text) do
      [_, secret] -> secret
      _ -> nil
    end
  end
end
