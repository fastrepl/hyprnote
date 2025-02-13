#[derive(clap::Args)]
pub struct CreateArgs {
    #[arg(long)]
    pub name: String,
}

pub fn handle_create(args: CreateArgs) -> anyhow::Result<()> {
    let extension_path = crate::get_extensions_path().join(args.name);
    std::fs::create_dir_all(&extension_path)?;

    create_package_json(&extension_path)?;
    run_pnpm_install()?;
    run_dprint_format()?;

    Ok(())
}

fn create_package_json(path: impl AsRef<std::path::Path>) -> anyhow::Result<()> {
    let path = path.as_ref();
    let package_json_path = path.join("package.json");

    let content = serde_json::json!({
        "name": format!("@hypr/extension-{}", path.file_name().unwrap().to_str().unwrap()),
        "version": "1.0.0",
        "license": "MIT",
        "keywords": [],
        "description": "",
        "main": "index.js",
        "scripts": {
            "test": "echo \"Error: no test specified\" && exit 1"
        },
        "dependencies": {}
    });

    std::fs::write(package_json_path, serde_json::to_string(&content)?)?;
    Ok(())
}

fn run_dprint_format() -> anyhow::Result<()> {
    let status = std::process::Command::new("dprint")
        .arg("fmt")
        .current_dir(crate::get_project_root_path())
        .status()
        .map_err(|e| anyhow::anyhow!("Failed to execute dprint: {}", e))?;

    if !status.success() {
        return Err(anyhow::anyhow!("dprint format failed"));
    }

    Ok(())
}

fn run_pnpm_install() -> anyhow::Result<()> {
    let status = std::process::Command::new("pnpm")
        .arg("i")
        .current_dir(crate::get_project_root_path())
        .status()
        .map_err(|e| anyhow::anyhow!("Failed to execute pnpm: {}", e))?;

    if !status.success() {
        return Err(anyhow::anyhow!("pnpm install failed"));
    }

    Ok(())
}
