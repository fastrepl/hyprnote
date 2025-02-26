pub trait AuthPluginExt<R: tauri::Runtime> {
    fn start_oauth_server(&self) -> Result<(), String>;
    fn cancel_oauth_server(&self) -> Result<(), String>;
    fn get_from_vault(&self, key: &str) -> Result<String, String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AuthPluginExt<R> for T {
    fn start_oauth_server(&self) -> Result<(), String> {
        todo!()
    }

    fn cancel_oauth_server(&self) -> Result<(), String> {
        todo!()
    }

    fn get_from_vault(&self, key: &str) -> Result<String, String> {
        todo!()
    }
}

// pub mod commands {
//     use crate::store::UserStore;

//     #[tauri::command]
//     #[specta::specta]
//     #[tracing::instrument(skip_all)]
//     pub fn is_authenticated(app: tauri::AppHandle) -> bool {
//         let auth = UserStore::get(&app).unwrap_or_default();
//         auth.user_id.is_some()
//     }

//     #[tauri::command]
//     #[specta::specta]
//     #[tracing::instrument(skip_all)]
//     pub async fn start_oauth_server(
//         app_handle: tauri::AppHandle,
//         app_state: tauri::State<'_, crate::App>,
//     ) -> Result<u16, String> {
//         let vault = app_state.vault.clone();

//         let port = tauri_plugin_oauth::start_with_config(
//             tauri_plugin_oauth::OauthConfig {
//                 ports: None,
//                 response: Some(
//                     r#"
// <!DOCTYPE html>
// <html lang="en">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Hyprnote</title>
//         <script src="https://cdn.twind.style" crossorigin></script>
//     </head>
//     <body class="bg-gray-100 flex items-center justify-center min-h-screen">
//         <div class="bg-white p-8 rounded-lg shadow-lg text-center">
//             <h1 class="text-2xl font-bold text-gray-800 mb-4">Authentication Successful</h1>
//             <p class="text-gray-600">Please go back to the app.</p>
//         </div>
//     </body>
// </html>"#
//                         .trim()
//                         .into(),
//                 ),
//             },
//             move |url| {
//                 let parsed_url = url::Url::parse(&url).unwrap();
//                 let query_pairs: Vec<_> = parsed_url.query_pairs().collect();

//                 let token = query_pairs
//                     .iter()
//                     .find(|(k, _)| k == "k")
//                     .map(|(_, v)| v.to_string());

//                 let user_id = query_pairs
//                     .iter()
//                     .find(|(k, _)| k == "u")
//                     .map(|(_, v)| v.to_string());

//                 tracing::info!(
//                     url = ?url,
//                     token = ?token,
//                     user_id = ?user_id,
//                     "oauth_callback"
//                 );

//                 if let (Some(token), Some(user_id)) = (token, user_id) {
//                     let auth = UserStore {
//                         user_id: Some(user_id),
//                     };

//                     vault.set(crate::vault::Key::RemoteServer, token).unwrap();

//                     UserStore::set(&app_handle, auth).unwrap();
//                 } else {
//                     tracing::error!("oauth_callback: Missing token or user_id");
//                 }
//             },
//         )
//         .map_err(|err| err.to_string())?;

//         Ok(port)
//     }

//     #[tauri::command]
//     #[specta::specta]
//     #[tracing::instrument(skip_all)]
//     pub async fn cancel_oauth_server(port: u16) -> Result<(), String> {
//         tauri_plugin_oauth::cancel(port).map_err(|err| err.to_string())
//     }
// }
