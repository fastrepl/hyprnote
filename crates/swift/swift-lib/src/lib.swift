@_cdecl("_prepare_audio_capture")
public func prepare_audio_capture() -> Bool {
  do {
    try AudioCaptureState.shared.prepare()
    return true
  } catch {
    return false
  }
}

@_cdecl("_start_audio_capture")
public func start_audio_capture() -> Bool {
  return AudioCaptureState.shared.start()
}

@_cdecl("_stop_audio_capture")
public func stop_audio_capture() {
}

@_cdecl("_read_audio_capture")
public func read_audio_capture() -> IntArray {
  return AudioCaptureState.shared.read()
}

@_cdecl("_audio_format")
public func audio_format() -> AudioFormat? {
  return AudioCaptureState.shared.format()
}
