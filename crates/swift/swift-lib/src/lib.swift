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

@_cdecl("_create_audio_capture")
public func _create_audio_capture() {
  _ = AudioCaptureState.shared
}

@_cdecl("_read_audio_capture")
public func _read_audio_capture() {
}

// https://github.com/insidegui/AudioCap
// https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps
public class AudioCaptureState {
  public static let shared = AudioCaptureState()

  private(set) var activated = false

  private let queue = DispatchQueue(label: "hypr-audio-capture", qos: .userInitiated)
  private var buffer: IntArray

  private var deviceProcID: AudioDeviceIOProcID?
  private var processTapID: AudioObjectID = .unknown
  private var aggregateDeviceID = AudioObjectID.unknown

  private init() {
    self.buffer = IntArray([])
  }

  func activate() {
    guard !activated else { return }
    activated = true
  }

  func deactivate() {
    guard activated else { return }
    activated = false

    if aggregateDeviceID.isValid {

    }

    if processTapID.isValid {

    }
  }

  private func start(queue: DispatchQueue, callback: @escaping AudioDeviceIOBlock) throws {
    var err = AudioDeviceCreateIOProcIDWithBlock(&deviceProcID, aggregateDeviceID, queue, callback)
    guard err == noErr else { throw AudioError.deviceError }
    err = AudioDeviceStart(aggregateDeviceID, deviceProcID)
    guard err == noErr else { throw AudioError.deviceError }
  }

  func stop() {
  }

  func read() -> IntArray {
    return buffer
  }

  private func prepare(deviceUID: String) throws {
    let tapDescription = CATapDescription()
    tapDescription.deviceUID = deviceUID
    tapDescription.uuid = UUID()
    tapDescription.muteBehavior = .unmuted
    var tapID: AUAudioObjectID = .unknown
    var err = AudioHardwareCreateProcessTap(tapDescription, &tapID)
    guard err == noErr else {
      throw AudioError.tapCreationError
    }

    let systemOutputID = try AudioDeviceID.readDefaultSystemOutputDevice()
    let outputUID = try systemOutputID.readDeviceUID()

    let aggregateDescription: [String: Any] = [
      kAudioAggregateDeviceNameKey: "hypr-audio-capture",
      kAudioAggregateDeviceUIDKey: UUID().uuidString,
      kAudioAggregateDeviceMainSubDeviceKey: outputUID,
      kAudioAggregateDeviceIsPrivateKey: true,
      kAudioAggregateDeviceIsStackedKey: false,
      kAudioAggregateDeviceTapAutoStartKey: true,
      kAudioAggregateDeviceSubDeviceListKey: [[kAudioSubDeviceUIDKey: outputUID]],
      kAudioAggregateDeviceTapListKey: [
        [
          kAudioSubTapDriftCompensationKey: true,
          kAudioSubTapUIDKey: tapDescription.uuid.uuidString,
        ]
      ],
    ]

    aggregateDeviceID = AudioObjectID.unknown
    err = AudioHardwareCreateAggregateDevice(
      aggregateDescription as CFDictionary, &aggregateDeviceID)
    guard err == noErr else {
      throw AudioError.aggregateDeviceError
    }
  }

  deinit { deactivate() }
}
