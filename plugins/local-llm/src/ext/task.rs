use std::future::Future;
use tauri::{Manager, Runtime};

pub trait LocalLlmTaskExt<R: Runtime> {
    fn generate_title(
        &self,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> impl Future<Output = Result<String, crate::Error>>;

    fn generate_tags(
        &self,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> impl Future<Output = Result<Vec<String>, crate::Error>>;

    fn postprocess_transcript(
        &self,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> impl Future<Output = Result<String, crate::Error>>;
}

impl<R: Runtime, T: Manager<R>> LocalLlmTaskExt<R> for T {
    async fn generate_title(
        &self,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> Result<String, crate::Error> {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;
        let v = hypr_llm::generate_title(&s.builtin_model, ctx).await?;
        Ok(v)
    }

    async fn generate_tags(
        &self,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> Result<Vec<String>, crate::Error> {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;
        let v = hypr_llm::generate_tags(&s.builtin_model, ctx).await?;
        Ok(v)
    }

    async fn postprocess_transcript(
        &self,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> Result<String, crate::Error> {
        let state = self.state::<crate::SharedState>();
        let s = state.lock().await;
        let v = hypr_llm::postprocess_transcript(&s.builtin_model, ctx).await?;
        Ok(v)
    }
}
