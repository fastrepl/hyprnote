// https://github.com/insidegui/AudioCap/blob/93881a4/AudioCap/ProcessTap/AudioRecordingPermission.swift

import SwiftRs
import Foundation

private let TCC_PATH = "/System/Library/PrivateFrameworks/TCC.framework/Versions/A/TCC"

private let apiHandle: UnsafeMutableRawPointer? = {
  dlopen(TCC_PATH, RTLD_NOW)
}()

private typealias PreflightFuncType = @convention(c) (CFString, CFDictionary?) -> Int
private typealias ResetFuncType = @convention(c) (CFString, CFString?) -> Int

@_cdecl("_audio_capture_permission_granted")
public func _audio_capture_permission_granted() -> Bool {
  guard let apiHandle,
    let funcSym = dlsym(apiHandle, "TCCAccessPreflight"),
    let preflight = unsafeBitCast(funcSym, to: PreflightFuncType.self) as PreflightFuncType?
  else {
    return false
  }

  return preflight("kTCCServiceAudioCapture" as CFString, nil) == 0
}

@_cdecl("_reset_audio_capture_permission")
public func _reset_audio_capture_permission(bundleId: SRString) -> Bool {
  guard let apiHandle,
    let funcSym = dlsym(apiHandle, "TCCAccessReset"),
    let reset = unsafeBitCast(funcSym, to: ResetFuncType.self) as ResetFuncType?
  else {
    return false
  }

  let nsString = NSString(string: String(describing: bundleId))
  return reset("kTCCServiceAudioCapture" as CFString, nsString as CFString) == 0
}

@_cdecl("_reset_microphone_permission")
public func _reset_microphone_permission(bundleId: SRString) -> Bool {
  guard let apiHandle,
    let funcSym = dlsym(apiHandle, "TCCAccessReset"),
    let reset = unsafeBitCast(funcSym, to: ResetFuncType.self) as ResetFuncType?
  else {
    return false
  }

  let nsString = NSString(string: String(describing: bundleId))
  return reset("kTCCServiceMicrophone" as CFString, nsString as CFString) == 0
}
