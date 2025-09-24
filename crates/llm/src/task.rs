use futures_util::StreamExt;

use hypr_gbnf::Grammar;
use hypr_llm_interface::ModelManager;
use hypr_template::{render, Template};

pub async fn generate_title(
    provider: &ModelManager,
    ctx: serde_json::Map<String, serde_json::Value>,
) -> Result<String, crate::Error> {
    let model = provider.get_model().await?;

    let stream = model.generate_stream(hypr_llama::LlamaRequest {
        messages: vec![
            hypr_llama::LlamaMessage {
                role: "system".into(),
                content: render(Template::CreateTitleSystem, &ctx).unwrap(),
            },
            hypr_llama::LlamaMessage {
                role: "user".into(),
                content: render(Template::CreateTitleUser, &ctx).unwrap(),
            },
        ],
        grammar: Some(Grammar::Title.build()),
        tools: None,
    })?;

    let items = stream
        .collect::<Vec<_>>()
        .await
        .into_iter()
        .filter_map(|r| match r {
            hypr_llama::Response::TextDelta(content) => Some(content.clone()),
            _ => None,
        })
        .collect::<Vec<_>>();
    let text = items.join("");

    Ok(text)
}

pub async fn generate_tags(
    provider: &ModelManager,
    ctx: serde_json::Map<String, serde_json::Value>,
) -> Result<Vec<String>, crate::Error> {
    let model = provider.get_model().await?;

    let stream = model.generate_stream(hypr_llama::LlamaRequest {
        messages: vec![
            hypr_llama::LlamaMessage {
                role: "system".into(),
                content: render(Template::SuggestTagsSystem, &ctx).unwrap(),
            },
            hypr_llama::LlamaMessage {
                role: "user".into(),
                content: render(Template::SuggestTagsUser, &ctx).unwrap(),
            },
        ],
        grammar: Some(Grammar::Tags.build()),
        tools: None,
    })?;

    let items = stream
        .collect::<Vec<_>>()
        .await
        .into_iter()
        .filter_map(|r| match r {
            hypr_llama::Response::TextDelta(content) => Some(content.clone()),
            _ => None,
        })
        .collect::<Vec<_>>();
    let text = items.join("");
    let tags = serde_json::from_str::<Vec<String>>(&text).unwrap_or_default();
    Ok(tags)
}

pub async fn postprocess_transcript(
    provider: &ModelManager,
    ctx: serde_json::Map<String, serde_json::Value>,
) -> Result<String, crate::Error> {
    let model = provider.get_model().await?;

    let stream = model.generate_stream(hypr_llama::LlamaRequest {
        messages: vec![
            hypr_llama::LlamaMessage {
                role: "system".into(),
                content: render(Template::PostprocessTranscriptSystem, &ctx).unwrap(),
            },
            hypr_llama::LlamaMessage {
                role: "user".into(),
                content: render(Template::PostprocessTranscriptUser, &ctx).unwrap(),
            },
        ],
        grammar: None,
        tools: None,
    })?;

    let items = stream
        .collect::<Vec<_>>()
        .await
        .into_iter()
        .filter_map(|r| match r {
            hypr_llama::Response::TextDelta(content) => Some(content.clone()),
            _ => None,
        })
        .collect::<Vec<_>>();
    let text = items.join("");
    Ok(text)
}
