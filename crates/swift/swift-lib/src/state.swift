// https://github.com/insidegui/AudioCap/tree/main/AudioCap/ProcessTap
// https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps

import AVFoundation
import AudioToolbox
import CoreAudio

// https://github.com/insidegui/AudioCap/blob/93881a4201cba1ee1cee558744492660caeaa3f1/AudioCap/ProcessTap/ProcessTap.swift#L7
public class AudioCaptureState {
  public static let shared = AudioCaptureState()

  private var audioQueue: AudioQueue<Int16> = AudioQueue()
  private let dispatchQueue = DispatchQueue(label: "hypr-dispatch-queue", qos: .userInitiated)

  private var deviceProcID: AudioDeviceIOProcID?
  private var aggregateDeviceID: AudioObjectID = kAudioObjectUnknown
  private var audioFormat: AudioFormat?
  private var tapStreamDescription: AudioStreamBasicDescription?

  private init() {}

  public func format() -> AudioFormat? {
    return audioFormat
  }

  public func prepare() throws {
    let tapDescription = CATapDescription(monoGlobalTapButExcludeProcesses: [])
    tapDescription.uuid = UUID()
    tapDescription.muteBehavior = .unmuted

    var tapID: AUAudioObjectID = kAudioObjectUnknown

    var err = AudioHardwareCreateProcessTap(tapDescription, &tapID)
    guard err == noErr else { throw AudioError.tapError }
    guard tapID != kAudioObjectUnknown else { throw AudioError.tapError }

    tapStreamDescription = try getAudioTapStreamBasicDescription(tapID: tapID)
    audioFormat = AudioFormat(from: tapStreamDescription!)

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
    guard aggregateDeviceID != kAudioObjectUnknown else { throw AudioError.deviceError }
  }

  public func start() -> Bool {
    let format = AVAudioFormat(streamDescription: &tapStreamDescription!)
    guard format != nil else { return false }

    do {
      // https://developer.apple.com/documentation/coreaudio/audiodeviceioblock
      // https://forums.swift.org/t/audiobuffer-syntax/40400/2
      // https://github.com/insidegui/AudioCap/blob/93881a4201cba1ee1cee558744492660caeaa3f1/AudioCap/ProcessTap/ProcessTap.swift#L227C35-L227C39
      try run(on: dispatchQueue) {
        [weak self] inputTimestamp, inputBuffer, _outputTimestamp, _outputBuffer, _callbackTimestamp
        in
        guard let self = self else { return }
        let buffer = AVAudioPCMBuffer(
          pcmFormat: format!, bufferListNoCopy: inputBuffer, deallocator: nil)
        self.audioQueue.push([Int16(buffer!.frameLength)])
      }
      return true
    } catch {
      return false
    }
  }

  public func stop() -> Bool {
    if let deviceProcID = deviceProcID {
      let err = AudioDeviceStop(aggregateDeviceID, deviceProcID)
      return err == noErr
    }
    return false
  }

  public func read() -> IntArray {
    var samples: [Int16] = []

    for _ in 0..<4 {
      if let sample = audioQueue.pop() {
        samples.append(sample)
      } else {
        break
      }
    }
    return IntArray(samples)
  }

  // https://github.com/insidegui/AudioCap/blob/93881a4201cba1ee1cee558744492660caeaa3f1/AudioCap/ProcessTap/ProcessTap.swift#L144
  private func run(on queue: DispatchQueue, callback: @escaping AudioDeviceIOBlock) throws {
    var err = AudioDeviceCreateIOProcIDWithBlock(&deviceProcID, aggregateDeviceID, queue, callback)
    guard err == noErr else { throw AudioError.deviceError }
    err = AudioDeviceStart(aggregateDeviceID, deviceProcID)
    guard err == noErr else { throw AudioError.deviceError }
  }
}
