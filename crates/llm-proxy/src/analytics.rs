use reqwest::Client;
use serde::Deserialize;

pub async fn fetch_generation_metadata(
    client: &Client,
    api_key: &str,
    generation_id: &str,
) -> Option<f64> {
    #[derive(Deserialize)]
    struct OpenRouterGenerationResponse {
        data: OpenRouterGenerationData,
    }

    #[derive(Deserialize)]
    struct OpenRouterGenerationData {
        total_cost: f64,
    }

    let url = format!(
        "https://openrouter.ai/api/v1/generation?id={}",
        generation_id
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .ok()?;

    if !response.status().is_success() {
        tracing::warn!(
            status = %response.status(),
            "failed to fetch generation metadata"
        );
        return None;
    }

    let data: OpenRouterGenerationResponse = response.json().await.ok()?;
    Some(data.data.total_cost)
}
