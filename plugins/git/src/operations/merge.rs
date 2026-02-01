use std::path::Path;

use crate::types::ConflictInfo;

pub fn check_conflicts(path: &Path) -> Result<Option<ConflictInfo>, crate::Error> {
    let repo = gix::discover(path)?;

    let merge_head = repo.git_dir().join("MERGE_HEAD");
    if !merge_head.exists() {
        return Ok(None);
    }

    let index = repo
        .index_or_empty()
        .map_err(|e| crate::Error::Custom(e.to_string()))?;

    let mut conflicted_files = Vec::new();

    for entry in index.entries() {
        if entry.stage() != gix::index::entry::Stage::Unconflicted {
            let path = String::from_utf8_lossy(entry.path(&index)).to_string();
            if !conflicted_files.contains(&path) {
                conflicted_files.push(path);
            }
        }
    }

    if conflicted_files.is_empty() {
        Ok(None)
    } else {
        Ok(Some(ConflictInfo {
            files: conflicted_files,
        }))
    }
}

pub fn abort_merge(path: &Path) -> Result<(), crate::Error> {
    let repo = gix::discover(path)?;
    let git_dir = repo.git_dir();

    let merge_head = git_dir.join("MERGE_HEAD");
    let merge_msg = git_dir.join("MERGE_MSG");
    let merge_mode = git_dir.join("MERGE_MODE");

    if merge_head.exists() {
        std::fs::remove_file(merge_head)?;
    }
    if merge_msg.exists() {
        std::fs::remove_file(merge_msg)?;
    }
    if merge_mode.exists() {
        std::fs::remove_file(merge_mode)?;
    }

    Ok(())
}
