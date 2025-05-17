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
        let mut rows = conn
            .query("SELECT id, conversations FROM sessions", ())
            .await
            .unwrap();

        let mut sessions = Vec::new();

        while let Some(row) = rows.next().await.unwrap() {
            let id = row.get_str(0).expect("id").to_string();
            let conversations_str = row.get_str(8).expect("conversations").to_string();

            let conversations: Vec<hypr_listener_interface::ConversationChunk> =
                serde_json::from_str(&conversations_str).unwrap_or_default();

            sessions.push((id, conversations));
        }

        for (id, conversations) in sessions {
            if conversations.is_empty() {
                continue;
            }

            let words = transform(conversations);

            conn.execute(
                "UPDATE sessions SET words = ? WHERE id = ?",
                (serde_json::to_string(&words).unwrap(), id.clone()),
            )
            .await
            .unwrap();

            conn.execute(
                "UPDATE sessions SET conversations = ? WHERE id = ?",
                ("[]", id),
            )
            .await
            .unwrap();
        }
    }
}
