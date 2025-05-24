#[allow(deprecated)]
pub mod conversation_to_words {
    fn transform(
        conversation: Vec<hypr_listener_interface::ConversationChunk>,
    ) -> Vec<hypr_listener_interface::Word> {
        conversation
            .into_iter()
            .flat_map(|chunk| chunk.transcripts)
            .flat_map(|transcript| {
                transcript
                    .text
                    .split_whitespace()
                    .filter(|s| !s.is_empty())
                    .map(|word| hypr_listener_interface::Word {
                        text: word.trim().to_string(),
                        speaker: None,
                        confidence: transcript.confidence,
                        start_ms: None,
                        end_ms: None,
                    })
                    .collect::<Vec<_>>()
            })
            .collect()
    }

    pub async fn run(conn: &libsql::Connection) {
        let mut rows = match conn
            .query("SELECT id, conversations FROM sessions", ())
            .await
        {
            Ok(rows) => rows,
            Err(_) => return,
        };

        let mut sessions = Vec::new();

        while let Some(row_result) = rows.next().await.transpose() {
            let row = match row_result {
                Ok(row) => row,
                Err(_) => continue,
            };

            let id = match row.get_str(0) {
                Ok(id) => id.to_string(),
                Err(_) => continue,
            };

            let conversations_str = match row.get_str(1) {
                Ok(convs) => convs.to_string(),
                Err(_) => continue,
            };

            let conversations: Vec<hypr_listener_interface::ConversationChunk> =
                serde_json::from_str(&conversations_str).unwrap_or_default();

            sessions.push((id, conversations));
        }

        for (id, conversations) in sessions {
            if conversations.is_empty() {
                continue;
            }

            let words = transform(conversations);

            if let Err(_) = conn
                .execute(
                    "UPDATE sessions SET words = ? WHERE id = ?",
                    (
                        serde_json::to_string(&words).unwrap_or_default(),
                        id.clone(),
                    ),
                )
                .await
            {
                continue;
            }

            let _ = conn
                .execute(
                    "UPDATE sessions SET conversations = ? WHERE id = ?",
                    ("[]", id),
                )
                .await;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_run() {
        let db = hypr_db_core::DatabaseBuilder::default()
            .local("./src/db.sqlite")
            .build()
            .await
            .unwrap();

        let conn = db.conn().unwrap();
        conversation_to_words::run(&conn).await;
    }
}
