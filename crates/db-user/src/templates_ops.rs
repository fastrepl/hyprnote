use super::{Template, UserDatabase};

impl UserDatabase {
    pub async fn list_templates(
        &self,
        user_id: impl Into<String>,
    ) -> Result<Vec<Template>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "SELECT * FROM templates WHERE user_id = ?",
                vec![user_id.into()],
            )
            .await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item = Template::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn upsert_template(&self, template: Template) -> Result<Template, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "INSERT INTO templates (
                    id,
                    user_id,
                    title,
                    description,
                    sections,
                    tags
                ) VALUES (
                    :id,
                    :user_id,
                    :title,
                    :description,
                    :sections,
                    :tags
                ) ON CONFLICT(id) DO UPDATE SET
                    title = :title,
                    description = :description,
                    sections = :sections,
                    tags = :tags
                RETURNING *",
                libsql::named_params! {
                    ":id": template.id,
                    ":user_id": template.user_id,
                    ":title": template.title,
                    ":description": template.description,
                    ":sections": serde_json::to_string(&template.sections).unwrap(),
                    ":tags": serde_json::to_string(&template.tags).unwrap(),
                },
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let template = Template::from_row(&row)?;
        Ok(template)
    }

    pub async fn delete_template(&self, id: String) -> Result<(), crate::Error> {
        let conn = self.conn()?;

        conn.query("DELETE FROM templates WHERE id = ?", vec![id])
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::{tests::setup_db, Human, Template};

    #[tokio::test]
    async fn test_templates() {
        let db = setup_db().await;

        let human = db
            .upsert_human(Human {
                full_name: Some("test".to_string()),
                ..Human::default()
            })
            .await
            .unwrap();

        let templates = db.list_templates(&human.id).await.unwrap();
        assert_eq!(templates.len(), 0);

        let _template = db
            .upsert_template(Template {
                id: uuid::Uuid::new_v4().to_string(),
                user_id: human.id.clone(),
                title: "test".to_string(),
                description: "test".to_string(),
                sections: vec![],
                tags: vec![],
            })
            .await
            .unwrap();

        let templates = db.list_templates(&human.id).await.unwrap();
        assert_eq!(templates.len(), 1);
    }
}
