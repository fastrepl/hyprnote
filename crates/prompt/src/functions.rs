use serde_json::{from_value, Value};
use std::collections::HashMap;

use hypr_db::user::{DiarizationBlock, Event, Participant, TranscriptBlock};

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

pub fn render_event_and_participants() -> impl tera::Function {
    Box::new(
        move |args: &HashMap<String, Value>| -> tera::Result<Value> {
            let _event: Option<Event> = from_value(
                args.get("event")
                    .ok_or(tera::Error::msg("'event' is required"))?
                    .clone(),
            )?;
            let _participants: Vec<Participant> = from_value(
                args.get("participants")
                    .ok_or(tera::Error::msg("'participants' is required"))?
                    .clone(),
            )?;

            Ok(Value::String("".to_string()))
        },
    )
}
