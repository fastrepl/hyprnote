use anyhow::Result;

use super::UserDatabase;
use crate::user::Template;

impl UserDatabase {
    pub async fn list_templates(&self) -> Result<Vec<Template>> {
        let mut rows = self.conn.query("SELECT * FROM templates", ()).await?;
        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item = Template::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn upsert_template(&self, template: Template) -> Result<Template> {
        let mut rows = self
            .conn
            .query(
                "INSERT INTO templates (
                    id,
                    title,
                    description,
                    sections
                ) VALUES (
                    :id,
                    :title,
                    :description,
                    :sections
                ) ON CONFLICT(id) DO UPDATE SET
                    title = :title,
                    description = :description,
                    sections = :sections
                RETURNING *",
                libsql::named_params! {
                    ":id": template.id,
                    ":title": template.title,
                    ":description": template.description,
                    ":sections": serde_json::to_string(&template.sections).unwrap(),
                },
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let template = Template::from_row(&row)?;
        Ok(template)
    }

    pub async fn delete_template(&self, id: String) -> Result<()> {
        self.conn
            .query("DELETE FROM templates WHERE id = ?", vec![id])
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::user::{ops::tests::setup_db, Transcript};

    #[tokio::test]
    async fn test_templates() {
        let db = setup_db().await;

        let templates = db.list_templates().await.unwrap();
        assert_eq!(templates.len(), 0);

        let template = db
            .upsert_template(Template {
                id: "test".to_string(),
                title: "test".to_string(),
                description: "test".to_string(),
                sections: vec![],
            })
            .await
            .unwrap();

        let templates = db.list_templates().await.unwrap();
        assert_eq!(templates.len(), 1);
    }
}
