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
                content: render(Template::TitleSystem, &ctx).unwrap(),
            },
            hypr_llama::LlamaMessage {
                role: "user".into(),
                content: render(Template::TitleUser, &ctx).unwrap(),
            },
        ],
        max_tokens: Some(30),
        grammar: Some(Grammar::Title.build()),
        ..Default::default()
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
