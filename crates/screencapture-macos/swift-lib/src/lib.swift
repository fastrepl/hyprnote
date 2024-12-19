@_cdecl("_start_audio_capture")
public func start_audio_capture() -> Bool {
  return AudioCaptureState.shared.start()
}

@_cdecl("_stop_audio_capture")
public func stop_audio_capture() -> Bool {
  return AudioCaptureState.shared.stop()
}
