defmodule Hypr.V0.TranscribeInputChunk do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.13.0"

  field :audio, 1, type: :bytes
end

defmodule Hypr.V0.TranscribeOutputChunk do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.13.0"

  field :text, 1, type: :string
end
