defmodule HyprWeb.Session do
  @behaviour Phoenix.Socket.Transport

  @impl Phoenix.Socket.Transport
  def child_spec(_opts), do: :ignore

  @impl Phoenix.Socket.Transport
  def connect(state), do: {:ok, state}

  @impl Phoenix.Socket.Transport
  def init(state) do
    state =
      state
      |> Map.put(:supervisor_pid, nil)

    {:ok, state}
  end

  @impl Phoenix.Socket.Transport
  def handle_in({_, _opts}, state) do
    state =
      state
      |> Map.put(:supervisor_pid, start_supervisor())

    {:ok, state}
  end

  @impl Phoenix.Socket.Transport
  def handle_info({:stt, {:transcript, text}}, state) do
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

  defp start_supervisor() do
    here = self()

    {:ok, pid} =
      Supervisor.start_link(HyprWeb.Session.Supervisor,
        strategy: :one_for_one,
        handle_stt: &send(here, {:stt, &1})
      )

    pid
  end
end

defmodule HyprWeb.Session.Supervisor do
  use Supervisor

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, opts)
  end

  def init(opts) do
    {handle_stt, opts} = Keyword.pop(opts, :handle_stt, &IO.inspect/1)

    children = [{Hypr.STT.Streaming, %{handle_stt: handle_stt}}]
    Supervisor.init(children, opts)
  end
end
