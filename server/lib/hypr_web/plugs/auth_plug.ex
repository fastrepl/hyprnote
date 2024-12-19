defmodule HyprWeb.AuthPlug do
  import Plug.Conn
  import Phoenix.Controller, only: [redirect: 2]

  def init(opts), do: opts

  def call(conn, _opts) do
    token = get_session(conn, :stytch_session_token)

    if token == nil do
      redirect_to_login(conn)
    else
      case Stytch.authenticate_session(token, %{}) do
        {:ok, %{session: _session}} -> conn
        {:error, _} -> redirect_to_login(conn)
      end
    end
  end

  defp redirect_to_login(conn) do
    conn
    |> delete_session(:stytch_session_token)
    |> redirect(to: "/auth/google/login")
    |> halt()
  end
end
