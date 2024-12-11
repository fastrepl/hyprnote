pub struct SessionState {}

impl SessionState {
    pub async fn new() -> anyhow::Result<Self> {
        Ok(Self {})
    }
}
