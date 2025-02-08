use std::collections::BTreeMap;

use notion_client::{
    endpoints::{
        databases::create::request::CreateADatabaseRequestBuilder,
        pages::create::request::CreateAPageRequestBuilder, Client,
    },
    objects::{
        block::{Block, BlockType, ParagraphValue},
        database::Database,
        page::{Page, PageProperty},
        parent::Parent,
        rich_text::{RichText, Text},
    },
};

pub struct NotionClient {
    client: Client,
}

#[derive(PartialOrd, Ord, Eq, PartialEq, strum::Display)]
enum SessionDatabasePropertyKey {
    #[strum(serialize = "Id")]
    Id,
    #[strum(serialize = "Title")]
    Title,
}

type SessionDatabaseProperty = BTreeMap<SessionDatabasePropertyKey, PageProperty>;

// https://github.com/takassh/notion-client/tree/main/examples
impl NotionClient {
    pub fn new(token: impl Into<String>) -> Self {
        let client = Client::new(token.into(), None).unwrap();
        Self { client }
    }

    pub async fn find_db(&self, db_id: impl AsRef<str>) -> anyhow::Result<Database> {
        let response = self
            .client
            .databases
            .retrieve_a_database(db_id.as_ref())
            .await?;

        Ok(response)
    }

    // https://developers.notion.com/reference/create-a-database
    pub async fn create_db(&self, page_id: impl Into<String>) -> anyhow::Result<Database> {
        let request = CreateADatabaseRequestBuilder::default()
            .title(vec![RichText::Text {
                text: Text {
                    content: "Hyprnote Meetings".to_string(),
                    link: None,
                },
                plain_text: None,
                annotations: None,
                href: None,
            }])
            .parent(Parent::PageId {
                page_id: page_id.into(),
            })
            .build()?;

        let response = self.client.databases.create_a_database(request).await?;
        Ok(response)
    }

    // https://developers.notion.com/reference/post-page
    pub async fn append_to_db(
        &self,
        db_id: impl Into<String>,
        session: hypr_db::user::Session,
    ) -> anyhow::Result<Page> {
        let properties: SessionDatabaseProperty = BTreeMap::from([
            (
                SessionDatabasePropertyKey::Id,
                PageProperty::RichText {
                    id: None,
                    rich_text: vec![RichText::Text {
                        text: Text {
                            content: session.id.to_string(),
                            link: None,
                        },
                        plain_text: None,
                        annotations: None,
                        href: None,
                    }],
                },
            ),
            (
                SessionDatabasePropertyKey::Title,
                PageProperty::Title {
                    id: None,
                    title: vec![RichText::Text {
                        text: Text {
                            content: session.title.to_string(),
                            link: None,
                        },
                        plain_text: None,
                        annotations: None,
                        href: None,
                    }],
                },
            ),
        ]);

        let children = vec![Block {
            object: None,
            id: None,
            parent: None,
            block_type: BlockType::Paragraph {
                paragraph: ParagraphValue {
                    rich_text: vec![RichText::Text {
                        text: Text {
                            content: session.title.to_string(),
                            link: None,
                        },
                        plain_text: None,
                        annotations: None,
                        href: None,
                    }],
                    color: None,
                    children: None,
                },
            },
            created_time: None,
            created_by: None,
            last_edited_time: None,
            last_edited_by: None,
            archived: None,
            has_children: None,
        }];

        let request = CreateAPageRequestBuilder::default()
            .parent(Parent::DatabaseId {
                database_id: db_id.into(),
            })
            .properties(
                properties
                    .into_iter()
                    .map(|(k, v)| (k.to_string(), v))
                    .collect(),
            )
            .children(children)
            .build()?;

        let response = self.client.pages.create_a_page(request).await?;
        Ok(response)
    }
}
