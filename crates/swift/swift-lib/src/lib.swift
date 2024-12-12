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
public func _read_audio_capture() -> IntArray {
  return AudioCaptureState.read()
}

// https://github.com/insidegui/AudioCap
// https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps
public class AudioCaptureState: NSObject {
  public static let shared = AudioCaptureState()

  private var tapID: AudioObjectID
  private var aggregateDeviceID: AudioObjectID
  private var buffer: IntArray

  private let queue = DispatchQueue(label: "hypr-audio-capture", qos: .userInitiated)

  private override init() {
    self.tapID = AudioObjectID(kAudioObjectUnknown)
    self.buffer = IntArray([])

    self.tapID = createTap()
    self.aggregateDeviceID = createAggregateDevice()

    super.init()
  }

  static func read() -> IntArray {
    return shared.buffer
  }

  // static func start(on queue: DispatchQueue) {
  //   var err = AudioDeviceCreateIOProcIDWithBlock(&deviceProcID, aggregateDeviceID, queue, ioBlock)
  //   err = AudioDeviceStart(aggregateDeviceID, deviceProcID)
  // }
}

func createTap() -> AudioObjectID {
  let description = CATapDescription()
  description.uuid = UUID()
  description.isPrivate = true
  description.isMono = true

  var tapID = AudioObjectID(kAudioObjectUnknown)
  AudioHardwareCreateProcessTap(description, &tapID)
  return tapID
}

func createAggregateDevice() -> AudioObjectID {
  let description: [String: Any] = [
    kAudioAggregateDeviceNameKey: "Sample Aggregate Audio Device",
    kAudioAggregateDeviceIsPrivateKey: true,
    kAudioAggregateDeviceUIDKey: UUID().uuidString,
  ]
  var aggregateID: AudioObjectID = 0
  AudioHardwareCreateAggregateDevice(description as CFDictionary, &aggregateID)
  return aggregateID
}

func getOutputDeviceID() -> AudioObjectID? {
  var propertyAddress = AudioObjectPropertyAddress(
    mSelector: kAudioHardwarePropertyDefaultOutputDevice,
    mScope: kAudioObjectPropertyScopeGlobal,
    mElement: kAudioObjectPropertyElementMain
  )

  var deviceID: AudioObjectID = kAudioObjectUnknown
  var dataSize = UInt32(MemoryLayout.size(ofValue: deviceID))

  let status = AudioObjectGetPropertyData(
    AudioObjectID(kAudioObjectSystemObject),
    &propertyAddress,
    0,
    nil,
    &dataSize,
    &deviceID
  )

  if status != noErr {
    return nil
  }

  return deviceID
}
