#[derive(clap::Args)]
pub struct ReadmeArgs {}

pub async fn handle_readme(_args: ReadmeArgs) -> anyhow::Result<()> {
    let _ = open::that("https://github.com/fastrepl/hyprnote/blob/main/owhisper/README.md");
    Ok(())
}
