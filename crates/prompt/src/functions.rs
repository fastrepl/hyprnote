use serde_json::Value;
use std::collections::HashMap;

use hypr_db::user::{DiarizationBlock, Event, Participant, TranscriptBlock};

fn get_arg<T: serde::de::DeserializeOwned>(
    args: &HashMap<String, Value>,
    key: &str,
) -> tera::Result<T> {
    serde_json::from_value(
        args.get(key)
            .ok_or(tera::Error::msg(format!("'{}' is required", key)))?
            .clone(),
    )
    .map_err(|e| tera::Error::msg(e.to_string()))
}

pub fn render_conversation() -> impl tera::Function {
    Box::new(
        move |args: &HashMap<String, Value>| -> tera::Result<Value> {
            let transcripts: Vec<TranscriptBlock> = get_arg(args, "transcripts")?;
            let diarizations: Vec<DiarizationBlock> = get_arg(args, "diarizations")?;

            #[derive(serde::Serialize, serde::Deserialize)]
            struct Item {
                speaker: String,
                transcript: TranscriptBlock,
            }

            let items = transcripts
                .iter()
                .map(|t| {
                    let diarization = diarizations
                        .iter()
                        .find(|d| d.start == t.start && d.end == t.end)
                        .unwrap();

                    Item {
                        speaker: diarization.label.clone(),
                        transcript: t.clone(),
                    }
                })
                .collect::<Vec<Item>>();

            let mut ctx = tera::Context::new();
            ctx.insert("items", &items);

            let rendered = tera::Tera::one_off(
                indoc::indoc! {"
                    {%- for item in items -%}
                        [{{ item.speaker }}]: {{ item.transcript.text }}
                    {% endfor -%}
                "},
                &ctx,
                false,
            )?;

            Ok(Value::String(rendered))
        },
    )
}
