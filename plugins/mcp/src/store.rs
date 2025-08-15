macro_rules! common_derives {
    ($item:item) => {
        #[derive(
            serde::Serialize, serde::Deserialize, Clone, Debug, specta::Type, PartialEq, Eq, Hash,
        )]
        $item
    };
}

common_derives! {
    pub struct McpServer {
        pub r#type: String,
        pub enabled: bool,
        pub url: String,
    }
}

common_derives! {
    #[derive(strum::Display)]
    pub enum StoreKey {
        Servers,
    }
}

impl tauri_plugin_store2::ScopedStoreKey for StoreKey {}
