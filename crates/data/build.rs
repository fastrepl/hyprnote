fn _run(name: &str) {
    let raw_path = format!("src/{}/raw.json", name);
    let raw_content = std::fs::read_to_string(&raw_path).unwrap();
    let raw: serde_json::Value = serde_json::from_str(&raw_content).unwrap();

    let _paragraphs =
        raw["results"]["channels"][0]["alternatives"][0]["paragraphs"]["paragraphs"].clone();
}

fn main() {}
