pub use clova;

// #[async_trait]
// impl IntoResource<Client<OpenAIConfig>> for Config {
//     async fn into_resource(self) -> Result<Client<OpenAIConfig>, Error> {
//         let mut openai_config = OpenAIConfig::new().with_api_key(self.api_key);
//         if let Some(api_base) = self.api_base {
//             openai_config = openai_config.with_api_base(api_base)
//         }
//         if let Some(org_id) = self.org_id {
//             openai_config = openai_config.with_org_id(org_id)
//         }
//         if let Some(project_id) = self.project_id {
//             openai_config = openai_config.with_project_id(project_id)
//         }
//         Ok(Client::with_config(openai_config))
//     }
// }
