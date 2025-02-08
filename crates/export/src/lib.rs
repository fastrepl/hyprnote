use std::collections::BTreeMap;

use notion_client::{
    endpoints::{
        databases::query::{request::QueryDatabaseRequestBuilder, response::QueryDatabaseResponse},
        pages::create::request::CreateAPageRequestBuilder,
        Client,
    },
    objects::{
        page::{Page, PageProperty},
        parent::Parent,
        rich_text::{RichText, Text},
    },
};
pub struct NotionClient {
    client: Client,
}

// https://github.com/takassh/notion-client/tree/main/examples
impl NotionClient {
    pub fn new(token: impl Into<String>) -> Self {
        let client = Client::new(token.into(), None).unwrap();
        Self { client }
    }

    // https://developers.notion.com/reference/post-database-query
    pub async fn list_databases(
        &self,
        db_id: impl AsRef<str>,
    ) -> anyhow::Result<QueryDatabaseResponse> {
        let request = QueryDatabaseRequestBuilder::default().build()?;
        let response = self
            .client
            .databases
            .query_a_database(db_id.as_ref(), request)
            .await?;

        Ok(response)
    }

    // https://developers.notion.com/reference/post-page
    pub async fn append_db(&self, db_id: impl Into<String>, data: &str) -> anyhow::Result<Page> {
        let request = CreateAPageRequestBuilder::default()
            .parent(Parent::DatabaseId {
                database_id: db_id.into(),
            })
            .properties(BTreeMap::from([(
                "title".to_string(),
                PageProperty::Title {
                    id: None,
                    title: vec![RichText::Text {
                        annotations: None,
                        href: None,
                        plain_text: Some(data.to_string()),
                        text: Text {
                            content: "".to_string(),
                            link: None,
                        },
                    }],
                },
            )]))
            .children(vec![])
            .build()?;

        let response = self.client.pages.create_a_page(request).await?;
        Ok(response)
    }
}
