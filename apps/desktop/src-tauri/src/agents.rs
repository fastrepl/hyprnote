use std::path::Path;

const AGENTS_CONTENT: &str = include_str!("agents-content.md");

pub fn write_agents_file(base_dir: &Path) -> std::io::Result<()> {
    let agents_path = base_dir.join("AGENTS.md");
    std::fs::write(agents_path, AGENTS_CONTENT)
}
