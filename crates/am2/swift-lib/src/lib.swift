import ArgmaxSDK
import Foundation
import SwiftRs

private var isAM2Ready = false
private var whisperKitPro: WhisperKitPro?

@_cdecl("initialize_am2_sdk")
public func initialize_am2_sdk(apiKey: SRString) {
  let key = apiKey.toString()
  let semaphore = DispatchSemaphore(value: 0)

  Task {
    await ArgmaxSDK.with(ArgmaxConfig(apiKey: key))
    isAM2Ready = true
    print("AM2 SDK initialized successfully with API key: \(key.prefix(10))...")
    semaphore.signal()
  }

  semaphore.wait()
}

@_cdecl("check_am2_ready")
public func check_am2_ready() -> Bool {
  return isAM2Ready
}

@_cdecl("transcribe_audio_file")
public func transcribe_audio_file(path: SRString) -> SRString {
  let audioPath = path.toString()
  print("Transcribing: \(audioPath)")

  var result = ""

  let semaphore = DispatchSemaphore(value: 0)

  Task {
    do {
      let config = WhisperKitProConfig(model: "large-v3-v20240930_626MB")
      let kit = try await WhisperKitPro(config)
      whisperKitPro = kit

      print("WhisperKitPro initialized, starting transcription...")

      let results = try await kit.transcribe(audioPath: audioPath)
      let transcript = WhisperKitProUtils.mergeTranscriptionResults(results).text
      result = transcript
      print("Transcription complete: \(result)")
    } catch {
      result = "Error: \(error.localizedDescription)"
      print("Transcription error: \(error)")
    }
    semaphore.signal()
  }

  semaphore.wait()
  return SRString(result)
}
