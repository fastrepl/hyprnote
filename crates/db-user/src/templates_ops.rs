use super::{Template, UserDatabase};

impl UserDatabase {
    pub async fn list_templates(
        &self,
        user_id: impl Into<String>,
    ) -> Result<Vec<Template>, crate::Error> {
        let conn = self.conn()?;

        let _user_id = user_id.into();

        let mut rows = conn.query("SELECT * FROM templates", ()).await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item = Template::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    /// Inserts a new template or updates an existing one identified by its `id`, then returns the stored template.
    ///
    /// If a row with the same `id` already exists, this operation updates its `title`, `description`, `sections`, `tags`, and `context_option` and returns the resulting row; otherwise it inserts a new row and returns it. Errors are propagated for database or row-conversion failures.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use crate::{UserDatabase, Template};
    /// # async fn example(db: &UserDatabase, template: Template) -> Result<(), crate::Error> {
    /// let stored = db.upsert_template(template).await?;
    /// // `stored` now contains the inserted or updated Template as persisted in the database.
    /// # Ok(())
    /// # }
    /// ```
    ///
    /// Returns the inserted or updated `Template`.
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
                    tags,
                    context_option,
                    created_at
                ) VALUES (
                    :id,
                    :user_id,
                    :title,
                    :description,
                    :sections,
                    :tags,
                    :context_option,
                    :created_at
                ) ON CONFLICT(id) DO UPDATE SET
                    title = :title,
                    description = :description,
                    sections = :sections,
                    tags = :tags,
                    context_option = :context_option
                RETURNING *",
                libsql::named_params! {
                    ":id": template.id,
                    ":user_id": template.user_id,
                    ":title": template.title,
                    ":description": template.description,
                    ":sections": serde_json::to_string(&template.sections).unwrap(),
                    ":tags": serde_json::to_string(&template.tags).unwrap(),
                    ":context_option": template.context_option.as_deref().unwrap_or(""),
                    ":created_at": template.created_at,
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

    /// Integration test that verifies listing templates for a user is empty, upserting a template, and then retrieving the inserted template.
    ///
    /// This test:
    /// - Creates a test database and a Human (user).
    /// - Asserts that listing templates for the user initially returns zero results.
    /// - Inserts a Template using `upsert_template`.
    /// - Asserts that listing templates for the user returns one result afterwards.
    ///
    /// # Examples
    ///
    /// ```
    /// # async fn run_test(db: &crate::UserDatabase) {
    /// let human = db
    ///     .upsert_human(crate::Human {
    ///         full_name: Some("test".to_string()),
    ///         ..crate::Human::default()
    ///     })
    ///     .await
    ///     .unwrap();
    ///
    /// let templates = db.list_templates(&human.id).await.unwrap();
    /// assert_eq!(templates.len(), 0);
    ///
    /// let _template = db
    ///     .upsert_template(crate::Template {
    ///         id: uuid::Uuid::new_v4().to_string(),
    ///         user_id: human.id.clone(),
    ///         title: "test".to_string(),
    ///         description: "test".to_string(),
    ///         sections: vec![],
    ///         tags: vec![],
    ///         context_option: Some(
    ///             r#"{"type":"tags","selections":["Meeting","Project A"]}"#.to_string(),
    ///         ),
    ///         created_at: chrono::Utc::now()
    ///             .to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
    ///     })
    ///     .await
    ///     .unwrap();
    ///
    /// let templates = db.list_templates(&human.id).await.unwrap();
    /// assert_eq!(templates.len(), 1);
    /// # }
    /// ```
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
                context_option: Some(
                    r#"{"type":"tags","selections":["Meeting","Project A"]}"#.to_string(),
                ),
                created_at: chrono::Utc::now()
                    .to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
            })
            .await
            .unwrap();

        let templates = db.list_templates(&human.id).await.unwrap();
        assert_eq!(templates.len(), 1);
    }
}