fn run(name: &str) {
    let raw_path = format!("src/{}/raw.json", name);
    let raw_content = std::fs::read_to_string(&raw_path).unwrap();
    let raw: serde_json::Value = serde_json::from_str(&raw_content).unwrap();

    let paragraphs =
        raw["results"]["channels"][0]["alternatives"][0]["paragraphs"]["paragraphs"].clone();

    let diarizations: Vec<hypr_listener_interface::DiarizationChunk> = paragraphs
        .as_array()
        .unwrap()
        .iter()
        .map(|v| hypr_listener_interface::DiarizationChunk {
            start: (v["start"].as_f64().unwrap() * 1000.0) as u64,
            end: (v["end"].as_f64().unwrap() * 1000.0) as u64,
            speaker: v["speaker"].as_i64().unwrap() as i32,
            confidence: None,
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
            confidence: None,
        })
        .collect();

    std::fs::write(
        format!("src/{}/transcription.json", name),
        serde_json::to_string_pretty(&transcripts).unwrap() + "\n",
    )
    .unwrap();

    std::fs::write(
        format!("src/{}/diarization.json", name),
        serde_json::to_string_pretty(&diarizations).unwrap() + "\n",
    )
    .unwrap();
}

fn main() {
    run("english_3");
    run("english_4");
    run("english_5");
}
