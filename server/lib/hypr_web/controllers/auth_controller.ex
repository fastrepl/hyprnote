defmodule HyprWeb.AuthController do
  use HyprWeb, :controller

  def login_google(conn, _params) do
    url =
      Stytch.start_oauth_url(
        "google",
        "public-token-test-55c89e10-a4c2-4cb7-8bf2-fa1c667e49cd"
      )

    redirect(conn, external: url)
  end

  def logout(conn, _params) do
    conn
    |> delete_session(:stytch_session_token)
    |> redirect(to: "/")
  end

  def callback(conn, %{"stytch_token_type" => "oauth", "token" => token}) do
    {:ok, %{session: %{stytch_session: %{session_token: session_token}}, user: _user}} =
      Stytch.authenticate_oauth(token, %{session_duration_minutes: 60})

    conn
    |> put_session(:stytch_session_token, session_token)
    |> redirect(to: "/")
  end
end
