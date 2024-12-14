// https://github.com/insidegui/AudioCap
// https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps

import AudioToolbox
import CoreAudio
import Foundation
import SwiftRs

public class IntArray: NSObject {
  var data: SRArray<Int>

  init(_ data: [Int]) {
    self.data = SRArray(data)
  }
}

@_cdecl("_get_default_audio_input_device_uid")
public func get_default_audio_input_device_uid() -> SRString {
  do {
    let uid = try getDefaultOutputDeviceUID()
    return SRString(uid as String)
  } catch {
    return SRString("")
  }
}

@_cdecl("_prepare_audio_capture")
public func prepare_audio_capture() {
  do {
    try AudioCaptureState.shared.prepare()
  } catch {
    print("Failed to prepare audio capture: \(error)")
  }
}

public class AudioCaptureState {
  public static let shared = AudioCaptureState()

  private var aggregateDeviceID: AudioObjectID = kAudioObjectUnknown

  private init() {
  }

  public func prepare() throws {
    let tapDescription = CATapDescription()
    tapDescription.deviceUID = try getDefaultOutputDeviceUID()
    tapDescription.uuid = UUID()
    tapDescription.muteBehavior = .unmuted
    var tapID: AUAudioObjectID = kAudioObjectUnknown
    var err = AudioHardwareCreateProcessTap(tapDescription, &tapID)
    // TODO: check err

    let systemOutputDeviceUID = try getDefaultSystemOutputDeviceUID()

    let aggregateDescription: [String: Any] = [
      kAudioAggregateDeviceNameKey: "hypr-audio-capture",
      kAudioAggregateDeviceUIDKey: UUID().uuidString,
      kAudioAggregateDeviceMainSubDeviceKey: systemOutputDeviceUID,
      kAudioAggregateDeviceIsPrivateKey: true,
      kAudioAggregateDeviceIsStackedKey: false,
      kAudioAggregateDeviceTapAutoStartKey: true,
      kAudioAggregateDeviceSubDeviceListKey: [[kAudioSubDeviceUIDKey: systemOutputDeviceUID]],
      kAudioAggregateDeviceTapListKey: [
        [
          kAudioSubTapDriftCompensationKey: true,
          kAudioSubTapUIDKey: tapDescription.uuid.uuidString,
        ]
      ],
    ]

    err = AudioHardwareCreateAggregateDevice(
      aggregateDescription as CFDictionary, &aggregateDeviceID)

    guard err == noErr else {
      throw AudioError.deviceError
    }
  }
}
