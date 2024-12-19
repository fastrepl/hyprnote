defmodule HyprWeb.AuthController do
  use HyprWeb, :controller

  def desktop_login_google(conn, %{"id" => id}) do
    conn
    |> redirect(external: ~p"/auth/web/login/google?id=#{id}")
  end

  def web_login_google(conn, params) do
    # https://stytch.com/docs/workspace-management/redirect-urls#user-app-state-example
    redirect_url =
      case params["id"] do
        nil -> HyprWeb.Endpoint.url() <> ~p"/auth/web/callback"
        id -> HyprWeb.Endpoint.url() <> ~p"/auth/web/callback?id=#{id}"
      end

    # https://stytch.com/docs/api/oauth-google-start
    url =
      Stytch.start_oauth_url(
        "google",
        Application.fetch_env!(:stytch, :public_token),
        # custom_scopes: "email profile https://www.googleapis.com/auth/calendar",
        login_redirect_url: redirect_url,
        signup_redirect_url: redirect_url
      )

    redirect(conn, external: url)
  end

  def web_logout(conn, _params) do
    conn
    |> delete_session(:stytch_session_token)
    |> redirect(to: ~p"/")
  end

  def web_callback(conn, %{"stytch_token_type" => "oauth", "token" => token}) do
    {:ok, %{session: %{stytch_session: %{session_token: session_token}}, user: _user}} =
      Stytch.authenticate_oauth(token, %{session_duration_minutes: 60})

    conn
    |> put_session(:stytch_session_token, session_token)
    |> redirect(to: ~p"/")
  end
end
