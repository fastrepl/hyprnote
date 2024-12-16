defmodule HyprWeb.Session do
  @behaviour Phoenix.Socket.Transport

  @impl Phoenix.Socket.Transport
  def child_spec(_opts), do: :ignore

  @impl Phoenix.Socket.Transport
  def connect(state), do: {:ok, state}

  @impl Phoenix.Socket.Transport
  def init(state) do
    {:ok, state}
  end

  @impl Phoenix.Socket.Transport
  def handle_in({_, _opts}, state) do
    {:ok, state}
  end

  @impl Phoenix.Socket.Transport
  def handle_info(_, state) do
    {:ok, state}
  end

  @impl Phoenix.Socket.Transport
  def terminate(:remote, _state), do: :ok
  def terminate({:error, :closed}, _state), do: :ok
  def terminate({:error, :idle}, _state), do: :ok
  def terminate({:error, :supervisor_died}, _state), do: :ok

  def terminate(e, _state) do
    IO.inspect(e)
    :ok
  end
end
