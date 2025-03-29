fn main() {
    let raw: serde_json::Value =
        serde_json::from_str(include_str!("src/english_3/raw.json")).unwrap();

    let paragraphs =
        raw["results"]["channels"][0]["alternatives"][0]["paragraphs"]["paragraphs"].clone();

    let diarizations: Vec<hypr_listener_interface::DiarizationChunk> = paragraphs
        .as_array()
        .unwrap()
        .iter()
        .map(|v| hypr_listener_interface::DiarizationChunk {
            start: (v["start"].as_f64().unwrap() * 1000.0) as u64,
            end: (v["end"].as_f64().unwrap() * 1000.0) as u64,
            speaker: v["speaker"].as_u64().unwrap().to_string(),
        })
        .collect();

    let transcripts: Vec<hypr_listener_interface::TranscriptChunk> = paragraphs
        .as_array()
        .unwrap()
        .iter()
        .map(|v| hypr_listener_interface::TranscriptChunk {
            text: v["sentences"]
                .as_array()
                .unwrap()
                .iter()
                .map(|s| s["text"].as_str().unwrap().to_string())
                .collect::<Vec<String>>()
                .join(" "),
            start: (v["start"].as_f64().unwrap() * 1000.0) as u64,
            end: (v["end"].as_f64().unwrap() * 1000.0) as u64,
        })
        .collect();

    std::fs::write(
        "src/english_3/transcription.json",
        serde_json::to_string_pretty(&transcripts).unwrap() + "\n",
    )
    .unwrap();

    std::fs::write(
        "src/english_3/diarization.json",
        serde_json::to_string_pretty(&diarizations).unwrap() + "\n",
    )
    .unwrap();
}
