pub async fn is_online(client: &reqwest::Client) -> bool {
    let url = "https://posthog.com/";

    match client.get(url).send().await {
        Ok(resp) if resp.status().is_success() => true,
        _ => false,
    }
}
