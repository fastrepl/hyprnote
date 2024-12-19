defmodule Hypr.STT.Streaming do
  @callback send_audio(pid(), binary(), keyword()) :: :ok | {:error, any()}

  def child_spec(arg), do: impl().child_spec(arg)
  def send_audio(client, audio, opts \\ []), do: impl().send_audio(client, audio, opts)
  def impl(), do: Application.get_env(:hypr, :stt_streaming, Hypr.STT.Streaming.Deepgram)
end
