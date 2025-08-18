use clap::Parser;

#[derive(Parser)]
pub struct ConfigArgs {}

pub async fn handle_config(_args: ConfigArgs) -> anyhow::Result<()> {
    let global_config_path = owhisper_config::global_config_path();

    if !global_config_path.exists() {
        log::warn!(
            "Global config file does not exist. Run `owhisper pull <model>' to get started."
        );
        return Ok(());
    }

    bat::PrettyPrinter::new()
        .input_file(global_config_path)
        .grid(true)
        .header(true)
        .language("json")
        .print()?;

    Ok(())
}
