use minijinja::Value;

pub fn transcript(segments: Value) -> Result<String, minijinja::Error> {
    let mut output = String::new();

    for segment in segments.try_iter()? {
        let channel = segment
            .get_attr("channel")
            .ok()
            .and_then(|v| v.as_i64())
            .unwrap_or(0);

        let text = segment
            .get_attr("text")
            .map(|v| v.to_string())
            .unwrap_or_default();

        output.push_str(&format!("[Channel {}]\n{}\n\n", channel, text));
    }

    Ok(output)
}
