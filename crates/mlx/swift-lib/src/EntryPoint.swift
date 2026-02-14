import Foundation
import MLXAudioCore
import MLXAudioSTT
import SwiftRs

@_cdecl("_mlx_smoke_test")
public func _mlxSmokeTest() -> Bool {
  return true
}

public final class MlxAsrResult: NSObject {
  public var text: SRString
  public var success: Bool
  public var error: SRString

  public init(text: String, success: Bool, error: String) {
    self.text = SRString(text)
    self.success = success
    self.error = SRString(error)
  }
}

private let qwenRepoID = "mlx-community/Qwen3-ASR-0.6B-8bit"
private var qwenAsrModel: Qwen3ASRModel?

private func expandTilde(_ path: String) -> String {
  if path == "~" {
    return NSHomeDirectory()
  }
  if path.hasPrefix("~/") {
    return NSString(string: NSHomeDirectory()).appendingPathComponent(String(path.dropFirst(2)))
  }
  return path
}

private func ensureCacheFromLocal(safetensorsPath: String, repoID: String) async throws {
  let modelSubdir = repoID.replacingOccurrences(of: "/", with: "_")
  let cacheDir = URL.cachesDirectory
    .appendingPathComponent("mlx-audio")
    .appendingPathComponent(modelSubdir)

  let fm = FileManager.default
  try fm.createDirectory(at: cacheDir, withIntermediateDirectories: true)

  let linkPath = cacheDir.appendingPathComponent("model.safetensors").path
  if !fm.fileExists(atPath: linkPath) {
    try fm.createSymbolicLink(atPath: linkPath, withDestinationPath: safetensorsPath)
  }

  let configPath = cacheDir.appendingPathComponent("config.json")
  guard !fm.fileExists(atPath: configPath.path) else { return }

  let metadataFiles = [
    "config.json",
    "tokenizer_config.json",
    "vocab.json",
    "merges.txt",
    "generation_config.json",
  ]

  for filename in metadataFiles {
    let filePath = cacheDir.appendingPathComponent(filename)
    if fm.fileExists(atPath: filePath.path) { continue }

    guard let url = URL(string: "https://huggingface.co/\(repoID)/resolve/main/\(filename)") else {
      continue
    }
    let (data, response) = try await URLSession.shared.data(from: url)
    if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
      try data.write(to: filePath)
    }
  }
}

@_cdecl("_mlx_qwen_asr_init")
public func _mlxQwenAsrInit(modelSource: SRString) -> Bool {
  let semaphore = DispatchSemaphore(value: 0)
  var success = false

  Task {
    do {
      let rawSource = modelSource.toString().trimmingCharacters(in: .whitespacesAndNewlines)
      let source = rawSource.isEmpty ? qwenRepoID : rawSource
      let expandedSource = expandTilde(source)

      if source.hasSuffix(".safetensors") && FileManager.default.fileExists(atPath: expandedSource) {
        try await ensureCacheFromLocal(safetensorsPath: expandedSource, repoID: qwenRepoID)
      }

      qwenAsrModel = try await Qwen3ASRModel.fromPretrained(qwenRepoID)
      success = true
    } catch {
      print("mlx init error: \(error)")
      qwenAsrModel = nil
      success = false
    }
    semaphore.signal()
  }

  semaphore.wait()
  return success
}

@_cdecl("_mlx_qwen_asr_transcribe_file")
public func _mlxQwenAsrTranscribeFile(audioPath: SRString) -> MlxAsrResult {
  let semaphore = DispatchSemaphore(value: 0)
  var output = MlxAsrResult(text: "", success: false, error: "unknown error")

  Task {
    do {
      guard let model = qwenAsrModel else {
        output = MlxAsrResult(text: "", success: false, error: "model is not initialized")
        semaphore.signal()
        return
      }

      let path = expandTilde(audioPath.toString())
      let url = URL(fileURLWithPath: path)

      let (sampleRate, audioData) = try loadAudioArray(from: url)
      if Int(sampleRate) != model.sampleRate {
        output = MlxAsrResult(
          text: "",
          success: false,
          error: "unsupported sample rate \(sampleRate), expected \(model.sampleRate)"
        )
        semaphore.signal()
        return
      }

      let result = model.generate(audio: audioData)
      output = MlxAsrResult(text: result.text, success: true, error: "")
    } catch {
      output = MlxAsrResult(text: "", success: false, error: String(describing: error))
    }

    semaphore.signal()
  }

  semaphore.wait()
  return output
}
