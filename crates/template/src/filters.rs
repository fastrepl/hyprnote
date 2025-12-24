use itertools::Itertools;
use minijinja::{ErrorKind, Value};

pub fn transcript(segments: Value) -> Result<String, minijinja::Error> {
    let mut output = String::new();

    for segment in segments.try_iter()? {
        let speaker_label = segment
            .get_attr("speaker_label")
            .map(|v| v.to_string())
            .unwrap_or_else(|_| "Unknown Speaker".to_string());

        let text = segment
            .get_attr("text")
            .map(|v| v.to_string())
            .unwrap_or_default();

        output.push_str(&format!("[{}]\n{}\n\n", speaker_label, text));
    }

    Ok(output)
}

pub fn timeline(words: Value) -> Result<String, minijinja::Error> {
    let words_vec: Vec<(String, Option<String>)> = words
        .try_iter()?
        .map(|word| {
            let text = word
                .get_attr("text")
                .map(|v| v.to_string())
                .unwrap_or_default();
            let speaker = word.get_attr("speaker").ok().and_then(|v| {
                let s = v.to_string();
                if s.is_empty() || s == "none" {
                    None
                } else {
                    Some(s)
                }
            });
            (text, speaker)
        })
        .collect();

    let output = words_vec
        .iter()
        .chunk_by(|(_, speaker)| speaker.clone())
        .into_iter()
        .map(|(speaker, group)| {
            let speaker_label = speaker.unwrap_or_else(|| "UNKNOWN".to_string());
            let text = group.map(|(text, _)| text.as_str()).join(" ");
            format!("[{}]\n{}", speaker_label, text)
        })
        .join("\n\n");

    Ok(output)
}

pub fn url(v: Value) -> Result<String, minijinja::Error> {
    let url = v.as_str().unwrap_or_default();

    let html = reqwest::blocking::get(url)
        .map_err(|e| minijinja::Error::new(ErrorKind::InvalidOperation, e.to_string()))?
        .text()
        .map_err(|e| minijinja::Error::new(ErrorKind::InvalidOperation, e.to_string()))?;

    let md = htmd::convert(&html)
        .map_err(|e| minijinja::Error::new(ErrorKind::InvalidOperation, e.to_string()))?;

    Ok(md)
}
