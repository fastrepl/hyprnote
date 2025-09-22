use futures_util::StreamExt;
use std::future::Future;

use tauri::{Manager, Runtime};
use tauri_plugin_template::{Template, TemplatePluginExt};

pub trait LocalLlmTaskExt<R: Runtime> {
    fn generate_title(
        &self,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> impl Future<Output = Result<String, crate::Error>>;

    fn generate_tags(
        &self,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> impl Future<Output = Result<Vec<String>, crate::Error>>;
}

impl<R: Runtime, T: Manager<R>> LocalLlmTaskExt<R> for T {
    async fn generate_title(
        &self,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> Result<String, crate::Error> {
        let model = {
            let state = self.state::<crate::SharedState>();
            let s = state.lock().await;
            s.builtin_model.get_model().await?
        };

        let stream = model.generate_stream(hypr_llama::LlamaRequest {
            messages: vec![
                hypr_llama::LlamaMessage {
                    role: "system".into(),
                    content: self
                        .render(Template::CreateTitleSystem, ctx.clone())
                        .unwrap(),
                },
                hypr_llama::LlamaMessage {
                    role: "user".into(),
                    content: self.render(Template::CreateTitleUser, ctx).unwrap(),
                },
            ],
            grammar: Some(hypr_gbnf::Grammar::Title.build()),
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

    async fn generate_tags(
        &self,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> Result<Vec<String>, crate::Error> {
        let model = {
            let state = self.state::<crate::SharedState>();
            let s = state.lock().await;
            s.builtin_model.get_model().await?
        };

        let stream = model.generate_stream(hypr_llama::LlamaRequest {
            messages: vec![
                hypr_llama::LlamaMessage {
                    role: "system".into(),
                    content: self
                        .render(Template::SuggestTagsSystem, ctx.clone())
                        .unwrap(),
                },
                hypr_llama::LlamaMessage {
                    role: "user".into(),
                    content: self.render(Template::SuggestTagsUser, ctx).unwrap(),
                },
            ],
            grammar: Some(hypr_gbnf::Grammar::Tags.build()),
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
}
