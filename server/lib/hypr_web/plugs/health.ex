defmodule HyprWeb.Plugs.Health do
  import Plug.Conn

  def init(opts), do: opts

  def call(%Plug.Conn{request_path: "/health"} = conn, _opts) do
    [db?()]
    |> Enum.all?()
    |> case do
      true -> conn |> send_resp(200, "OK") |> halt()
      false -> conn |> send_resp(500, "") |> halt()
    end
  end

  def call(conn, _opts), do: conn

  defp db?() do
    try do
      Ecto.Adapters.SQL.query(Nemo.Repo, "select 1", [])
      :ok
    rescue
      DBConnection.ConnectionError -> :error
    end
  end
end
