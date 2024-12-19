defmodule Hypr.Repo do
  use Ecto.Repo,
    otp_app: :hypr,
    adapter: Ecto.Adapters.Postgres
end
