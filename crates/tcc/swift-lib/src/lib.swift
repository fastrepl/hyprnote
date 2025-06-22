// https://github.com/insidegui/AudioCap/blob/93881a4/AudioCap/ProcessTap/AudioRecordingPermission.swift

import Foundation

private let TCC_PATH = "/System/Library/PrivateFrameworks/TCC.framework/Versions/A/TCC"

private let apiHandle: UnsafeMutableRawPointer? = {
  dlopen(TCC_PATH, RTLD_NOW)
}()

private typealias PreflightFuncType = @convention(c) (CFString, CFDictionary?) -> Int

@_cdecl("_macos_audio_capture_permission")
public func _macos_audio_capture_permission() -> Bool {
  guard let apiHandle,
    let funcSym = dlsym(apiHandle, "TCCAccessPreflight"),
    let preflight = unsafeBitCast(funcSym, to: PreflightFuncType.self) as PreflightFuncType?
  else {
    return false
  }

  return preflight("kTCCServiceAudioCapture" as CFString, nil) == 0
}
