pub mod commands {
    use tauri::State;

    use crate::App;
    use hypr_db::user::ParticipantFilter;

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn list_calendars(state: State<'_, App>) -> Result<Vec<hypr_db::user::Calendar>, ()> {
        Ok(state.db.list_calendars().await.unwrap())
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn upsert_calendar(
        state: State<'_, App>,
        calendar: hypr_db::user::Calendar,
    ) -> Result<hypr_db::user::Calendar, ()> {
        Ok(state.db.upsert_calendar(calendar).await.unwrap())
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn upsert_session(
        state: State<'_, App>,
        session: hypr_db::user::Session,
    ) -> Result<hypr_db::user::Session, ()> {
        Ok(state.db.upsert_session(session).await.unwrap())
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn list_templates(state: State<'_, App>) -> Result<Vec<hypr_db::user::Template>, ()> {
        Ok(state.db.list_templates().await.unwrap())
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn upsert_template(
        state: State<'_, App>,
        template: hypr_db::user::Template,
    ) -> Result<hypr_db::user::Template, ()> {
        Ok(state.db.upsert_template(template).await.unwrap())
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn delete_template(state: State<'_, App>, id: String) -> Result<(), ()> {
        Ok(state.db.delete_template(id).await.unwrap())
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn list_events(state: State<'_, App>) -> Result<Vec<hypr_db::user::Event>, ()> {
        Ok(state.db.list_events().await.unwrap())
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn list_sessions(
        state: State<'_, App>,
        search: Option<&str>,
    ) -> Result<Vec<hypr_db::user::Session>, ()> {
        Ok(state.db.list_sessions(search).await.unwrap())
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn list_participants(
        state: State<'_, App>,
        filter: ParticipantFilter,
    ) -> Result<Vec<hypr_db::user::Participant>, ()> {
        Ok(state.db.list_participants(filter).await.unwrap())
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn upsert_participant(
        state: State<'_, App>,
        participant: hypr_db::user::Participant,
    ) -> Result<hypr_db::user::Participant, ()> {
        Ok(state.db.upsert_participant(participant).await.unwrap())
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn get_session(
        state: State<'_, App>,
        option: hypr_db::user::GetSessionOption,
    ) -> Result<Option<hypr_db::user::Session>, String> {
        let found = state
            .db
            .get_session(option)
            .await
            .map_err(|e| e.to_string())?;
        Ok(found)
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn set_session_event(
        state: State<'_, App>,
        session_id: String,
        event_id: String,
    ) -> Result<(), String> {
        let _ = state
            .db
            .session_set_event(session_id, event_id)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn get_config(
        state: State<'_, App>,
        kind: hypr_db::user::ConfigKind,
    ) -> Result<hypr_db::user::Config, ()> {
        let found = state.db.get_config(kind.clone()).await.unwrap();

        match (found, kind) {
            (None, hypr_db::user::ConfigKind::Profile) => {
                Ok(hypr_db::user::ConfigDataProfile::default().into())
            }
            (None, hypr_db::user::ConfigKind::General) => {
                Ok(hypr_db::user::ConfigDataGeneral::default().into())
            }
            (Some(config), hypr_db::user::ConfigKind::Profile) => Ok(config),
            (Some(config), hypr_db::user::ConfigKind::General) => Ok(config),
        }
    }

    #[tauri::command]
    #[specta::specta]
    #[tracing::instrument(skip(state))]
    pub async fn set_config(
        state: State<'_, App>,
        config: hypr_db::user::Config,
    ) -> Result<(), ()> {
        Ok(state.db.set_config(config).await.unwrap())
    }
}
