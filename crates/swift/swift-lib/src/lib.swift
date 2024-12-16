@_cdecl("_start_audio_capture")
public func start_audio_capture() -> Bool {
  return AudioCaptureState.shared.start()
}

@_cdecl("_stop_audio_capture")
public func stop_audio_capture() -> Bool {
  return AudioCaptureState.shared.stop()
}

@_cdecl("_read_samples")
public func read_samples(max: Int) -> IntArray {
  return AudioCaptureState.shared.read_samples(max: max)
}

@_cdecl("_available_samples")
public func available_samples() -> Int {
  return AudioCaptureState.shared.available_samples()
}

@_cdecl("_audio_format")
public func audio_format() -> AudioFormat? {
  return AudioCaptureState.shared.format()
}

@_cdecl("_count_taps")
public func count_taps() -> Int {
  return AudioCaptureState.shared.count_taps()
}
