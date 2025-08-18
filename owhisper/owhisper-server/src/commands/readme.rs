#[derive(clap::Args)]
pub struct ReadmeArgs {}

pub async fn handle_readme(_args: ReadmeArgs) -> anyhow::Result<()> {
    let _ = open::that("https://docs.hyprnote.com/owhisper");
    Ok(())
}
