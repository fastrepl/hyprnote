defmodule Hypr.V0.ServerToClient do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.13.0"

  field :audio, 1, type: :bytes
end

defmodule Hypr.V0.ClientToServer do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.13.0"

  oneof :payload, 0

  field :audio, 1, type: :bytes, oneof: 0
  field :device, 2, type: Hypr.V0.Device, oneof: 0
end

defmodule Hypr.V0.Device do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.13.0"

  field :id, 1, type: :string
  field :key, 2, type: :string
end