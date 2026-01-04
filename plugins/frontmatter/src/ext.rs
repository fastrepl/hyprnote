use std::collections::HashMap;

pub struct Frontmatter<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    _manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Frontmatter<'a, R, M> {
    pub fn deserialize(&self, input: String) -> std::result::Result<ParsedDocument, crate::Error> {
        let doc =
            hypr_frontmatter::Document::<HashMap<String, serde_yaml::Value>>::from_str(&input)?;

        let frontmatter_json: HashMap<String, serde_json::Value> = doc
            .frontmatter
            .into_iter()
            .map(|(k, v)| {
                let json_value = serde_json::to_value(&v).unwrap_or(serde_json::Value::Null);
                (k, json_value)
            })
            .collect();

        Ok(ParsedDocument {
            frontmatter: frontmatter_json,
            content: doc.content,
        })
    }

    pub fn serialize(&self, doc: ParsedDocument) -> std::result::Result<String, crate::Error> {
        let frontmatter_yaml: HashMap<String, serde_yaml::Value> = doc
            .frontmatter
            .into_iter()
            .map(|(k, v)| {
                let yaml_value = serde_yaml::to_value(&v).unwrap_or(serde_yaml::Value::Null);
                (k, yaml_value)
            })
            .collect();

        let doc = hypr_frontmatter::Document::new(frontmatter_yaml, doc.content);
        doc.render().map_err(crate::Error::from)
    }
}

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub struct ParsedDocument {
    pub frontmatter: HashMap<String, serde_json::Value>,
    pub content: String,
}

pub trait FrontmatterPluginExt<R: tauri::Runtime> {
    fn frontmatter(&self) -> Frontmatter<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> FrontmatterPluginExt<R> for T {
    fn frontmatter(&self) -> Frontmatter<'_, R, Self>
    where
        Self: Sized,
    {
        Frontmatter {
            _manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
