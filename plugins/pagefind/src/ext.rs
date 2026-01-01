use std::collections::BTreeMap;
use std::path::PathBuf;

use codes_iso_639::part_1::LanguageCode;

fn detect_language(content: &str) -> String {
    let lang_code = match whichlang::detect_language(content) {
        whichlang::Lang::Ara => LanguageCode::Ar,
        whichlang::Lang::Cmn => LanguageCode::Zh,
        whichlang::Lang::Deu => LanguageCode::De,
        whichlang::Lang::Eng => LanguageCode::En,
        whichlang::Lang::Fra => LanguageCode::Fr,
        whichlang::Lang::Hin => LanguageCode::Hi,
        whichlang::Lang::Ita => LanguageCode::It,
        whichlang::Lang::Jpn => LanguageCode::Ja,
        whichlang::Lang::Kor => LanguageCode::Ko,
        whichlang::Lang::Nld => LanguageCode::Nl,
        whichlang::Lang::Por => LanguageCode::Pt,
        whichlang::Lang::Rus => LanguageCode::Ru,
        whichlang::Lang::Spa => LanguageCode::Es,
        whichlang::Lang::Swe => LanguageCode::Sv,
        whichlang::Lang::Tur => LanguageCode::Tr,
        whichlang::Lang::Vie => LanguageCode::Vi,
    };
    lang_code.code().to_string()
}

#[derive(Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct IndexRecord {
    pub url: String,
    pub content: String,
    pub title: Option<String>,
    pub filters: Option<std::collections::HashMap<String, Vec<String>>>,
    pub meta: Option<std::collections::HashMap<String, String>>,
}

pub struct Pagefind<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

fn get_index_lock<R: tauri::Runtime>(
    manager: &impl tauri::Manager<R>,
) -> std::sync::Arc<std::sync::Mutex<()>> {
    std::sync::Arc::clone(&manager.state::<crate::ManagedState>().index_lock)
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Pagefind<'a, R, M> {
    pub fn pagefind_dir(&self) -> Result<PathBuf, crate::Error> {
        let app_data_dir = self.manager.path().app_data_dir()?;
        Ok(app_data_dir.join("pagefind"))
    }

    pub async fn build_index(&self, records: Vec<IndexRecord>) -> Result<(), crate::Error> {
        let pagefind_dir = self.pagefind_dir()?;
        let lock = get_index_lock(self.manager);
        build_index_inner(pagefind_dir, records, lock).await
    }

    pub fn get_bundle_path(&self) -> Result<String, crate::Error> {
        let pagefind_dir = self.pagefind_dir()?;
        let path_str = pagefind_dir.to_string_lossy().to_string();
        Ok(path_str)
    }

    pub fn clear_index(&self) -> Result<(), crate::Error> {
        let lock = get_index_lock(self.manager);
        let _guard = lock.lock().unwrap();
        let pagefind_dir = self.pagefind_dir()?;
        if pagefind_dir.exists() {
            std::fs::remove_dir_all(&pagefind_dir)?;
        }
        Ok(())
    }
}

pub async fn build_index_inner(
    pagefind_dir: PathBuf,
    records: Vec<IndexRecord>,
    lock: std::sync::Arc<std::sync::Mutex<()>>,
) -> Result<(), crate::Error> {
    tokio::task::spawn_blocking(move || {
        let _guard = lock.lock().unwrap();
        build_index_sync(pagefind_dir, records)
    })
    .await
    .map_err(|e| crate::Error::Pagefind(e.to_string()))?
}

pub fn build_index_sync(
    pagefind_dir: PathBuf,
    records: Vec<IndexRecord>,
) -> Result<(), crate::Error> {
    use pagefind::api::PagefindIndex;
    use pagefind::options::PagefindServiceConfig;

    std::fs::create_dir_all(&pagefind_dir)?;

    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|e| crate::Error::Pagefind(e.to_string()))?;

    rt.block_on(async {
        let options = PagefindServiceConfig::builder()
            .keep_index_url(true)
            .build();

        let mut index = PagefindIndex::new(Some(options)).map_err(|e| crate::Error::Anyhow(e))?;

        for record in records {
            let mut meta = std::collections::BTreeMap::new();
            if let Some(t) = record.title {
                meta.insert("title".to_string(), t);
            }
            if let Some(m) = record.meta {
                for (k, v) in m {
                    meta.insert(k, v);
                }
            }

            let filters = record
                .filters
                .map(|f| f.into_iter().collect::<BTreeMap<_, _>>());

            let language = detect_language(&record.content);
            index
                .add_custom_record(
                    record.url,
                    record.content,
                    language,
                    Some(meta),
                    filters,
                    None,
                )
                .await
                .map_err(|e| crate::Error::Anyhow(e))?;
        }

        let files = index
            .get_files()
            .await
            .map_err(|e| crate::Error::Anyhow(e))?;

        for file in files {
            let file_path = pagefind_dir.join(&file.filename);
            if let Some(parent) = file_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::write(&file_path, &file.contents)?;
        }

        Ok::<(), crate::Error>(())
    })
}

pub trait PagefindPluginExt<R: tauri::Runtime> {
    fn pagefind(&self) -> Pagefind<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> PagefindPluginExt<R> for T {
    fn pagefind(&self) -> Pagefind<'_, R, Self>
    where
        Self: Sized,
    {
        Pagefind {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
