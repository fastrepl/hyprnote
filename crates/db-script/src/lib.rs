#[allow(deprecated)]
mod conversation_to_words {
    fn transform(
        conversation: Vec<hypr_db_user::ConversationChunk>,
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
        let mut rows = conn.query("SELECT * FROM sessions", ()).await.unwrap();

        let mut items = Vec::new();
        while let Some(row) = rows.next().await.unwrap() {
            let item: hypr_db_user::Session = libsql::de::from_row(&row).unwrap();
            items.push(item);
        }

        for session in items {
            if !session.conversations.is_empty() && session.words.is_empty() {
                let words = transform(session.conversations);
                conn.execute(
                    "UPDATE sessions SET words = ? WHERE id = ?",
                    (serde_json::to_string(&words).unwrap(), session.id),
                )
                .await
                .unwrap();
            }
        }
    }
}
