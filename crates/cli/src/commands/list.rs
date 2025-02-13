#[derive(clap::Args)]
pub struct ListArgs {
    #[arg(long, env = "DATABASE_URL")]
    pub database_url: String,
    #[arg(long, env = "DATABASE_TOKEN")]
    pub database_token: String,
}

pub fn handle_list(_args: ListArgs) -> anyhow::Result<()> {
    let extensions = list_extensions()?;

    for extension in extensions {
        println!("{}", extension.display());
    }

    Ok(())
}

fn list_extensions() -> anyhow::Result<Vec<std::path::PathBuf>> {
    let extensions_path = crate::get_extensions_path();

    let mut paths = Vec::new();
    for entry in std::fs::read_dir(extensions_path)? {
        let entry = entry?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        paths.push(path);
    }

    Ok(paths)
}
