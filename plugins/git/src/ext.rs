use std::path::Path;

pub struct Git<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    _manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Git<'a, R, M> {
    pub fn init(&self, path: &Path) -> Result<(), crate::Error> {
        gix::init(path)?;
        Ok(())
    }

    pub fn add(&self, path: &Path, patterns: Vec<String>) -> Result<(), crate::Error> {
        let repo = gix::discover(path)?;
        let index_path = repo.git_dir().join("index");

        let mut index = if index_path.exists() {
            gix::index::File::at(
                &index_path,
                repo.object_hash(),
                false,
                gix::index::decode::Options::default(),
            )
            .map_err(|e| crate::Error::Custom(e.to_string()))?
        } else {
            gix::index::File::from_state(
                gix::index::State::new(repo.object_hash()),
                index_path.clone(),
            )
        };

        for pattern in patterns {
            let file_path = path.join(&pattern);
            if !file_path.exists() || !file_path.is_file() {
                continue;
            }

            let data = std::fs::read(&file_path)?;
            let oid = repo
                .write_blob(&data)
                .map_err(|e| crate::Error::Custom(e.to_string()))?;

            let stat = gix::index::entry::Stat::default();

            index.dangerously_push_entry(
                stat,
                oid.into(),
                gix::index::entry::Flags::empty(),
                gix::index::entry::Mode::FILE,
                pattern.as_bytes().into(),
            );
        }

        let options = gix::index::write::Options::default();
        let file = std::fs::File::create(&index_path)?;
        index
            .write_to(file, options)
            .map_err(|e| crate::Error::Custom(e.to_string()))?;

        Ok(())
    }

    pub fn commit(&self, path: &Path, message: &str) -> Result<String, crate::Error> {
        let repo = gix::discover(path)?;

        let tree_id = {
            let index = repo
                .index_or_empty()
                .map_err(|e| crate::Error::Custom(e.to_string()))?;
            let mut tree = gix::objs::Tree::empty();

            for entry in index.entries() {
                tree.entries.push(gix::objs::tree::Entry {
                    mode: gix::objs::tree::EntryKind::Blob.into(),
                    filename: entry.path(&index).into(),
                    oid: entry.id,
                });
            }

            repo.write_object(&tree)
                .map_err(|e| crate::Error::Custom(e.to_string()))?
        };

        let parents: Vec<gix::ObjectId> = repo
            .head_id()
            .ok()
            .map(|id| id.detach())
            .into_iter()
            .collect();

        let commit_id = repo
            .commit("HEAD", message, tree_id, parents)
            .map_err(|e| crate::Error::Custom(e.to_string()))?;

        Ok(commit_id.to_string())
    }

    pub fn status(&self, path: &Path) -> Result<Vec<String>, crate::Error> {
        let repo = gix::discover(path)?;
        let index = repo
            .index_or_empty()
            .map_err(|e| crate::Error::Custom(e.to_string()))?;

        let mut files = Vec::new();
        for entry in index.entries() {
            files.push(String::from_utf8_lossy(entry.path(&index)).to_string());
        }

        Ok(files)
    }
}

pub trait GitPluginExt<R: tauri::Runtime> {
    fn git(&self) -> Git<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> GitPluginExt<R> for T {
    fn git(&self) -> Git<'_, R, Self>
    where
        Self: Sized,
    {
        Git {
            _manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
