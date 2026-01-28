use std::path::PathBuf;

use crate::Result;

pub enum FileOp {
    Write { path: PathBuf, content: String },
}

pub fn apply_ops(ops: Vec<FileOp>) -> Result<()> {
    for op in ops {
        match op {
            FileOp::Write { path, content } => {
                if path.exists() {
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
