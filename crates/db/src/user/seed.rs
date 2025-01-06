use super::{Session, Transcript, UserDatabase};

pub async fn seed(db: &UserDatabase) -> anyhow::Result<()> {
    let sessions = vec![
        Session {
            title: "Session 1".to_string(),
            tags: vec!["test".to_string()],
            transcript: Some(Transcript {
                speakers: vec![],
                blocks: vec![],
            }),
            ..Session::default()
        },
        Session {
            title: "Session 2".to_string(),
            tags: vec!["test".to_string()],
            transcript: Some(Transcript {
                speakers: vec![],
                blocks: vec![],
            }),
            ..Session::default()
        },
    ];

    for session in sessions {
        let _ = db.create_session(session).await.unwrap();
    }

    Ok(())
}
