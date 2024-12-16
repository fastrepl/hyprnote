defmodule HyprWeb.Router do
  use HyprWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", HyprWeb do
    pipe_through :api
  end
end
