use hypr_db::user::{DiarizationBlock, TranscriptBlock};
use serde_json::{from_value, Value};
use std::collections::HashMap;

pub fn render_conversation() -> impl tera::Function {
    Box::new(
        move |args: &HashMap<String, Value>| -> tera::Result<Value> {
            let transcripts: Vec<TranscriptBlock> = from_value(
                args.get("transcripts")
                    .ok_or(tera::Error::msg("'transcripts' is required"))?
                    .clone(),
            )?;
            let diarizations: Vec<DiarizationBlock> = from_value(
                args.get("diarizations")
                    .ok_or(tera::Error::msg("'diarizations' is required"))?
                    .clone(),
            )?;

            let conversation = transcripts
                .iter()
                .map(|t| {
                    let diarization = diarizations
                        .iter()
                        .find(|d| d.start == t.start && d.end == t.end)
                        .unwrap();

                    format!("[{}]: {}\n", diarization.label, t.text)
                })
                .collect::<String>();

            Ok(Value::String(conversation))
        },
    )
}
