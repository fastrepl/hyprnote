use std::path::PathBuf;

use crate::Result;

pub enum FileOp {
    Write {
        path: PathBuf,
        content: String,
        force: bool,
    },
}

pub fn apply_ops(ops: Vec<FileOp>) -> Result<()> {
    for op in ops {
        match op {
            FileOp::Write {
                path,
                content,
                force,
            } => {
                if path.exists() && !force {
                    continue;
                }
                if let Some(parent) = path.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                std::fs::write(&path, &content)?;
            }
        }
    }
    Ok(())
}
