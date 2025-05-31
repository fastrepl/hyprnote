pub async fn is_online() -> bool {
    let target = "8.8.8.8".to_string();
    let interval = std::time::Duration::from_secs(1);
    let options = pinger::PingOptions::new(target, interval, None);

    if let Ok(stream) = pinger::ping(options) {
        if let Some(message) = stream.into_iter().next() {
            match message {
                pinger::PingResult::Pong(_, _) => return true,
                _ => return false,
            }
        }
    }

    false
}
