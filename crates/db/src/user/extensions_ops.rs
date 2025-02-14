use super::{ExtensionDefinition, ExtensionMapping, UserDatabase};

impl UserDatabase {
    pub async fn list_extension_definitions(
        &self,
    ) -> Result<Vec<ExtensionDefinition>, crate::Error> {
        let mut rows = self
            .conn
            .query("SELECT * FROM extension_definitions", ())
            .await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await? {
            let item: ExtensionDefinition = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn list_extension_mappings(
        &self,
        user_id: impl Into<String>,
    ) -> Result<Vec<ExtensionMapping>, crate::Error> {
        let mut rows = self
            .conn
            .query(
                "SELECT * FROM extension_mappings WHERE user_id = ?",
                vec![user_id.into()],
            )
            .await?;

        let mut items = Vec::new();
        while let Some(row) = rows.next().await? {
            let item: ExtensionMapping = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }
}
