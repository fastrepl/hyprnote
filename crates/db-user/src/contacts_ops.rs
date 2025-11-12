use super::{Contact, UserDatabase};

impl UserDatabase {
    pub async fn get_contact(&self, id: impl AsRef<str>) -> Result<Option<Contact>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query("SELECT * FROM contacts WHERE id = ?", vec![id.as_ref()])
            .await?;

        match rows.next().await? {
            Some(row) => {
                let contact: Contact = libsql::de::from_row(&row)?;
                Ok(Some(contact))
            }
            None => Ok(None),
        }
    }

    pub async fn list_contacts(
        &self,
        user_id: impl AsRef<str>,
    ) -> Result<Vec<Contact>, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "SELECT * FROM contacts WHERE user_id = ?",
                vec![user_id.as_ref()],
            )
            .await
            .unwrap();

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: Contact = libsql::de::from_row(&row)?;
            items.push(item);
        }
        Ok(items)
    }

    pub async fn delete_contact(&self, contact_id: impl AsRef<str>) -> Result<(), crate::Error> {
        let conn = self.conn()?;

        conn.execute(
            "DELETE FROM contacts WHERE id = ?",
            vec![contact_id.as_ref()],
        )
        .await?;

        Ok(())
    }

    pub async fn upsert_contact(&self, contact: Contact) -> Result<Contact, crate::Error> {
        let conn = self.conn()?;

        let mut rows = conn
            .query(
                "INSERT INTO contacts (
                    id,
                    tracking_id,
                    user_id,
                    platform,
                    given_name,
                    family_name,
                    organization,
                    emails,
                    phone_numbers,
                    note
                ) VALUES (
                    :id,
                    :tracking_id,
                    :user_id,
                    :platform,
                    :given_name,
                    :family_name,
                    :organization,
                    :emails,
                    :phone_numbers,
                    :note
                ) ON CONFLICT(tracking_id) DO UPDATE SET
                    given_name = :given_name,
                    family_name = :family_name,
                    organization = :organization,
                    emails = :emails,
                    phone_numbers = :phone_numbers,
                    note = :note
                RETURNING *",
                libsql::named_params! {
                    ":id": contact.id,
                    ":tracking_id": contact.tracking_id,
                    ":user_id": contact.user_id,
                    ":platform": contact.platform.to_string(),
                    ":given_name": contact.given_name,
                    ":family_name": contact.family_name,
                    ":organization": contact.organization,
                    ":emails": contact.emails,
                    ":phone_numbers": contact.phone_numbers,
                    ":note": contact.note,
                },
            )
            .await?;

        let row = rows.next().await?.unwrap();
        let contact: Contact = libsql::de::from_row(&row)?;
        Ok(contact)
    }
}

#[cfg(test)]
mod tests {
    use crate::{tests::setup_db, Contact, Human, Platform};

    #[tokio::test]
    async fn test_contacts() {
        let db = setup_db().await;

        let contacts = db
            .list_contacts(uuid::Uuid::new_v4().to_string())
            .await
            .unwrap();
        assert_eq!(contacts.len(), 0);

        let human = db
            .upsert_human(Human {
                full_name: Some("yujonglee".to_string()),
                ..Human::default()
            })
            .await
            .unwrap();

        let input_1 = Contact {
            id: uuid::Uuid::new_v4().to_string(),
            tracking_id: "test-contact".to_string(),
            user_id: human.id.clone(),
            platform: Platform::Apple,
            given_name: "John".to_string(),
            family_name: "Doe".to_string(),
            organization: Some("Acme Corp".to_string()),
            emails: "[\"john@example.com\"]".to_string(),
            phone_numbers: "[\"+1234567890\"]".to_string(),
            note: Some("Test contact".to_string()),
        };

        let output_1 = db.upsert_contact(input_1.clone()).await.unwrap();
        assert_eq!(output_1, input_1);

        let output_2 = db.upsert_contact(input_1.clone()).await.unwrap();
        assert_eq!(output_2, input_1);

        let contacts = db.list_contacts(&human.id).await.unwrap();
        assert_eq!(contacts.len(), 1);
    }
}
