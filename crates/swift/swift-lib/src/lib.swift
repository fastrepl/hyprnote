// https://github.com/insidegui/AudioCap
// https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps

import AudioToolbox
import CoreAudio
import Foundation
import SwiftRs

public class IntArray: NSObject {
  var data: SRArray<Int16>

  init(_ data: [Int16]) {
    self.data = SRArray(data)
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

@_cdecl("_read_audio_capture")
public func read_audio_capture() -> IntArray {
  return AudioCaptureState.shared.read()
}

// https://github.com/insidegui/AudioCap/blob/93881a4201cba1ee1cee558744492660caeaa3f1/AudioCap/ProcessTap/ProcessTap.swift#L7
public class AudioCaptureState {
  public static let shared = AudioCaptureState()

  private var deviceProcID: AudioDeviceIOProcID?
  private var aggregateDeviceID: AudioObjectID = kAudioObjectUnknown

  private init() {}

  public func prepare() throws {
    let tapDescription = CATapDescription()
    tapDescription.deviceUID = try getDefaultOutputDeviceUID()
    tapDescription.uuid = UUID()
    tapDescription.muteBehavior = .unmuted
    var tapID: AUAudioObjectID = kAudioObjectUnknown

    var err = AudioHardwareCreateProcessTap(tapDescription, &tapID)
    guard err == noErr else { throw AudioError.tapError }

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
    guard err == noErr else { throw AudioError.deviceError }
  }

  public func start() {
  }

  public func stop() {
  }

  public func read() -> IntArray {
    return IntArray([1, 2, 3, 4])
  }

  private func run(queue: DispatchQueue, callback: @escaping AudioDeviceIOBlock) throws {
    var err = AudioDeviceCreateIOProcIDWithBlock(&deviceProcID, aggregateDeviceID, queue, callback)
    guard err == noErr else { throw AudioError.deviceError }

    err = AudioDeviceStart(aggregateDeviceID, deviceProcID)
    guard err == noErr else { throw AudioError.deviceError }
  }
}
