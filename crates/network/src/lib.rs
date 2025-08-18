use reqwest::Client;
use std::time::Duration;

pub async fn is_online() -> bool {
    let client = Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .unwrap();


    let url = "https://posthog.com/";

    match client.get(url).send().await {
        Ok(resp) if resp.status().is_success() => true,
        _ => false,
    }
}
