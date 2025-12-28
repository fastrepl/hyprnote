import Argmax
import Foundation
import SwiftRs

var speakerKitInstance: SpeakerKitPro?

public class DiarizationResultArray: NSObject {
  var starts: SRArray<Double>
  var ends: SRArray<Double>
  var speakers: SRArray<Int32>
  var count: Int32

  init(starts: [Double], ends: [Double], speakers: [Int32]) {
    self.starts = SRArray(starts)
    self.ends = SRArray(ends)
    self.speakers = SRArray(speakers)
    self.count = Int32(starts.count)
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
    return DiarizationResultArray(starts: [], ends: [], speakers: [])
  }

  let semaphore = DispatchSemaphore(value: 0)
  var starts: [Double] = []
  var ends: [Double] = []
  var speakers: [Int32] = []

  Task {
    do {
      let audioArray = Array(UnsafeBufferPointer(start: samplesPtr, count: samplesLen))

      try await speakerKit.initializeDiarization(audioArray: audioArray) { audioClip in
        Task {
          do {
            try await speakerKit.processSpeakerSegment(audioArray: audioClip)
          } catch {
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
      let rttmLines = try speakerKit.generateRTTM(from: result, fileName: "audio")

      for line in rttmLines {
        let rttmString = line.toString()
        let parts = rttmString.split(separator: " ")

        if parts.count >= 8 {
          let turnOnset = Double(parts[3]) ?? 0.0
          let turnDuration = Double(parts[4]) ?? 0.0
          let speakerLabel = String(parts[7])
          let speakerId = Int32(speakerLabel.dropFirst("SPEAKER_".count)) ?? 0

          starts.append(turnOnset)
          ends.append(turnOnset + turnDuration)
          speakers.append(speakerId)
        }
      }
    } catch {
    }
    semaphore.signal()
  }

  semaphore.wait()
  return DiarizationResultArray(starts: starts, ends: ends, speakers: speakers)
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
