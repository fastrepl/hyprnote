# https://developers.deepgram.com/docs/lower-level-websockets

defmodule Hypr.STT.Streaming.Deepgram do
  @behaviour Hypr.STT.Streaming

  use WebSockex

  @impl Hypr.STT.Streaming
  def start_link(%{handle_stt: _} = state) do
    params =
      %{
        # https://developers.deepgram.com/docs/model
        model: "nova-2-general",
        # https://developers.deepgram.com/docs/speech-started
        vad_events: true,
        # https://developers.deepgram.com/docs/utterance-end
        utterance_end_ms: 1000,
        interim_results: true,
        # https://developers.deepgram.com/docs/endpointing
        # https://developers.deepgram.com/docs/understand-endpointing-interim-results#controlling-endpointing
        endpointing: 20,
        # https://developers.deepgram.com/docs/filler-words
        filler_words: true
      }
      |> Map.merge(%{
        # https://developers.deepgram.com/docs/encoding
        encoding: "linear16",
        sample_rate: 16000
      })

    # https://developers.deepgram.com/reference/listen-live
    url =
      URI.new!("wss://api.deepgram.com")
      |> URI.append_path("/v1/listen")
      |> URI.append_query(URI.encode_query(params))
      |> URI.to_string()

    # https://developers.deepgram.com/docs/authentication
    api_key = Application.fetch_env!(:hypr, :deepgram_api_key)
    headers = [{"Authorization", "Token #{api_key}"}]

    state =
      state
      |> Map.put(:speaking?, false)
      |> Map.put(:vad_queue, Queue.new(2))

    with {:ok, pid} <- WebSockex.start_link(url, __MODULE__, state, extra_headers: headers) do
      Process.send_after(pid, :keep_alive, 3000)
      {:ok, pid}
    end
  end

  @impl Hypr.STT.Streaming
  def send_audio(pid, audio, _opts \\ []) do
    WebSockex.cast(pid, {:audio, audio})
  end

  @impl WebSockex
  def handle_cast({:audio, audio}, state) do
    # https://developers.deepgram.com/reference/listen-live#sending-audio-data
    {:reply, {:binary, audio}, state}
  end

  @impl WebSockex
  def handle_frame({:text, data}, state), do: handle_in(Jason.decode!(data), state)

  # https://developers.deepgram.com/reference/listen-live#response-schema
  # https://developers.deepgram.com/docs/understand-endpointing-interim-results
  # https://developers.deepgram.com/docs/understanding-end-of-speech-detection
  defp handle_in(
         %{
           "type" => "Results",
           "is_final" => _is_final,
           "speech_final" => _speech_final,
           "channel" => %{"alternatives" => [%{"transcript" => transcript} | _]}
         },
         state
       ) do
    if not state.speaking? do
      state.handle_stt.({:transcript, transcript})
      state.handle_stt.(:utterance_end)
      {:ok, Map.put(state, :speaking?, false)}
    else
      {:ok, state}
    end
  end

  # https://developers.deepgram.com/docs/speech-started
  defp handle_in(%{"type" => "SpeechStarted"}, state), do: {:ok, state}

  # https://developers.deepgram.com/docs/utterance-end
  defp handle_in(%{"type" => "UtteranceEnd"}, state), do: {:ok, state}

  defp handle_in(_, state), do: {:ok, state}

  # https://developers.deepgram.com/docs/audio-keep-alive#sending-keepalive
  @impl WebSockex
  def handle_info(:keep_alive, state) do
    Process.send_after(self(), :keep_alive, 3000)

    msg = Jason.encode!(%{type: "KeepAlive"})
    {:reply, {:text, msg}, state}
  end

  # https://developers.deepgram.com/docs/finalize
  def handle_info(:flush, state) do
    msg = Jason.encode!(%{type: "Finalize"})
    {:reply, {:text, msg}, state}
  end

  @impl WebSockex
  def terminate(reason, state) do
    IO.inspect(reason)

    # https://developers.deepgram.com/docs/close-stream
    msg = Jason.encode!(%{type: "CloseStream"})
    {:reply, {:text, msg}, state}
  end
end
