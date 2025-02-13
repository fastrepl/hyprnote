use clap::Parser;

#[derive(Parser, Debug)]
struct Cli {
    #[arg(long, env = "DATABASE_URL")]
    database_url: String,
    #[arg(long, env = "DATABASE_TOKEN")]
    database_token: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _args = Cli::parse();

    Ok(())
}
