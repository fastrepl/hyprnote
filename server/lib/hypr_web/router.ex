defmodule HyprWeb.Router do
  use HyprWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {HyprWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :browser_unauthenticated do
    plug :browser
  end

  pipeline :browser_authenticated do
    plug :browser
    plug HyprWeb.AuthPlug
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", HyprWeb do
    pipe_through :browser_authenticated

    get "/", PageController, :home
  end

  scope "/auth", HyprWeb do
    pipe_through :browser_unauthenticated

    get "/desktop/login/google", AuthController, :desktop_login_google
    get "/web/login/google", AuthController, :web_login_google
    get "/web/logout", AuthController, :web_logout
    get "/web/callback", AuthController, :web_callback
  end

  if Application.compile_env(:hypr, :dev_routes) do
    scope "/dev" do
      pipe_through :browser

      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
