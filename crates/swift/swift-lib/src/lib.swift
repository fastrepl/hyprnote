import SwiftRs
import Foundation

@_cdecl("_get_device_id")
public func getDeviceId() -> SRString {
  let hostName = ProcessInfo.processInfo.hostName
  return SRString(hostName)
}

// https://github.com/insidegui/AudioCap
// https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps
