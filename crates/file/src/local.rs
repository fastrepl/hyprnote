pub async fn save(
    stream: impl futures_core::Stream<Item = f32>,
    local_path: std::path::PathBuf,
) -> Result<(), crate::Error> {
    Ok(())
}
