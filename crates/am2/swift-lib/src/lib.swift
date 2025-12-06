import Argmax
import Foundation
import SwiftRs

private var vadInstance: VoiceActivityDetector?
private var speakerKitInstance: SpeakerKitPro?

@_cdecl("initialize_am2_sdk")
public func initialize_am2_sdk(apiKey: SRString) {
  let semaphore = DispatchSemaphore(value: 0)

  Task {
    let key = apiKey.toString()
    if !key.isEmpty {
      await ArgmaxSDK.with(ArgmaxConfig(apiKey: key))
    }
    semaphore.signal()
  }

  semaphore.wait()
}

public class VadResultArray: NSObject {
  var data: SRArray<Bool>

  init(_ data: [Bool]) {
    self.data = SRArray(data)
  }
}

@_cdecl("am2_vad_init")
public func am2_vad_init() -> Bool {
  let semaphore = DispatchSemaphore(value: 0)
  var success = false

  Task {
    do {
      vadInstance = try await VoiceActivityDetector.modelVAD()
      success = true
    } catch {
      success = false
    }
    semaphore.signal()
  }

  semaphore.wait()
  return success
}

@_cdecl("am2_vad_detect")
public func am2_vad_detect(
  samplesPtr: UnsafePointer<Float>,
  samplesLen: Int
) -> VadResultArray {
  guard let vad = vadInstance else {
    return VadResultArray([])
  }

  let audioArray = Array(UnsafeBufferPointer(start: samplesPtr, count: samplesLen))
  let voiceSegments = vad.voiceActivity(in: audioArray)

  return VadResultArray(voiceSegments)
}

@_cdecl("am2_vad_index_to_seconds")
public func am2_vad_index_to_seconds(index: Int) -> Float {
  guard let vad = vadInstance else {
    return 0.0
  }
  return vad.voiceActivityIndexToSeconds(index)
}

public class DiarizationSegment: NSObject {
  var start: Double
  var end: Double
  var speaker: Int32

  init(start: Double, end: Double, speaker: Int32) {
    self.start = start
    self.end = end
    self.speaker = speaker
  }
}

public class DiarizationResultArray: NSObject {
  var data: SRArray<DiarizationSegment>

  init(_ data: [DiarizationSegment]) {
    self.data = SRArray(data)
  }
}

@_cdecl("am2_diarization_init")
public func am2_diarization_init() -> Bool {
  let semaphore = DispatchSemaphore(value: 0)
  var success = false

  Task {
    do {
      let config = SpeakerKitProConfig()
      speakerKitInstance = try await SpeakerKitPro(config) { oldState, newState in
      }
      success = true
    } catch {
      print("[am2] Diarization init failed: \(error)")
      success = false
    }
    semaphore.signal()
  }

  semaphore.wait()
  return success
}

@_cdecl("am2_diarization_process")
public func am2_diarization_process(
  samplesPtr: UnsafePointer<Float>,
  samplesLen: Int,
  numSpeakers: Int32
) -> DiarizationResultArray {
  guard let speakerKit = speakerKitInstance else {
    return DiarizationResultArray([])
  }

  let semaphore = DispatchSemaphore(value: 0)
  var segments: [DiarizationSegment] = []

  Task {
    do {
      let audioArray = Array(UnsafeBufferPointer(start: samplesPtr, count: samplesLen))

      try await speakerKit.initializeDiarization(audioArray: audioArray) { audioClip in
        Task {
          do {
            try await speakerKit.processSpeakerSegment(audioArray: audioClip)
          } catch {
            print("[am2] processSpeakerSegment failed: \(error)")
          }
        }
      }

      let options: DiarizationOptions?
      if numSpeakers > 0 {
        options = DiarizationOptions(numberOfSpeakers: Int(numSpeakers))
      } else {
        options = nil
      }

      let result = try await speakerKit.diarize(options: options)

      for segment in result.segments {
        segments.append(
          DiarizationSegment(
            start: segment.start,
            end: segment.end,
            speaker: Int32(segment.speaker)
          ))
      }
    } catch {
      print("[am2] Diarization process failed: \(error)")
    }
    semaphore.signal()
  }

  semaphore.wait()
  return DiarizationResultArray(segments)
}

@_cdecl("am2_diarization_deinit")
public func am2_diarization_deinit() {
  let semaphore = DispatchSemaphore(value: 0)

  Task {
    speakerKitInstance?.unloadModels()
    speakerKitInstance = nil
    semaphore.signal()
  }

  semaphore.wait()
}
