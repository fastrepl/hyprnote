//! `chat/store/queries.ts`: the `chat_groups` / `chat_messages` statements.

use sqlx::SqlitePool;

use super::Store;
use crate::chat::{GroupRow, MessageRow, Scope};

const UPSERT_MESSAGE_SQL: &str = "
    INSERT INTO chat_messages (
      id, workspace_id, chat_group_id, owner_user_id, role, content,
      metadata_json, parts_json, status, created_at, updated_at, deleted_at
    )
    VALUES (?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      chat_group_id = excluded.chat_group_id,
      owner_user_id = excluded.owner_user_id,
      role = excluded.role,
      content = excluded.content,
      metadata_json = excluded.metadata_json,
      parts_json = excluded.parts_json,
      status = excluded.status,
      updated_at = excluded.updated_at,
      deleted_at = NULL
";

const UPSERT_GROUP_SQL: &str = "
    INSERT INTO chat_groups (
      id, workspace_id, owner_user_id, title, created_at, updated_at,
      deleted_at
    )
    VALUES (?, '', ?, ?, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      owner_user_id = excluded.owner_user_id,
      title = excluded.title,
      updated_at = excluded.updated_at,
      deleted_at = NULL
";

/// `chatGroupScopePredicate`: a group is in the automations scope when any
/// of its messages carries `metadata.chatScope = 'automations'`.
const AUTOMATIONS_SCOPE_EXISTS: &str = "
    EXISTS (
      SELECT 1
      FROM chat_messages AS m
      WHERE m.chat_group_id = g.id
        AND m.deleted_at IS NULL
        AND CASE
          WHEN json_valid(m.metadata_json)
            THEN json_extract(m.metadata_json, '$.chatScope')
          ELSE NULL
        END = 'automations'
    )
";

const MESSAGES_SQL: &str = "
    SELECT id, chat_group_id, owner_user_id, role, content, metadata_json,
           parts_json, status, created_at
    FROM chat_messages
    WHERE chat_group_id = ? AND deleted_at IS NULL
    ORDER BY created_at, id
";

/// `OWNER_USER_SQL` in `shared/owner-user.ts`.
const OWNER_USER_SQL: &str = "
    SELECT user_id
    FROM (
      SELECT owner_user_id AS user_id, updated_at, 0 AS source_priority
      FROM sessions
      WHERE owner_user_id <> '' AND deleted_at IS NULL

      UNION ALL

      SELECT id AS user_id, updated_at, 1 AS source_priority
      FROM humans
      WHERE id = owner_user_id AND id <> '' AND deleted_at IS NULL

      UNION ALL

      SELECT owner_user_id AS user_id, updated_at, 2 AS source_priority
      FROM chat_groups
      WHERE owner_user_id <> '' AND deleted_at IS NULL
    )
    ORDER BY source_priority, updated_at DESC, user_id
    LIMIT 1
";

fn now() -> String {
    chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string()
}

async fn upsert_message(
    executor: &mut sqlx::SqliteConnection,
    message: &MessageRow,
    updated_at: &str,
) -> anyhow::Result<()> {
    sqlx::query(UPSERT_MESSAGE_SQL)
        .bind(&message.id)
        .bind(&message.chat_group_id)
        .bind(&message.owner_user_id)
        .bind(&message.role)
        .bind(&message.content)
        .bind(&message.metadata_json)
        .bind(&message.parts_json)
        .bind(&message.status)
        .bind(&message.created_at)
        .bind(updated_at)
        .execute(executor)
        .await?;
    Ok(())
}

impl Store {
    /// `useOwnerUserId()`: the owner of the local data, else `DEFAULT_USER_ID`.
    pub fn owner_user_id(&self) -> tokio::task::JoinHandle<String> {
        let db = self.db.clone();
        self.runtime.spawn(async move {
            sqlx::query_scalar::<_, String>(OWNER_USER_SQL)
                .fetch_optional(db.pool())
                .await
                .ok()
                .flatten()
                .map(|id| id.trim().to_string())
                .filter(|id| !id.is_empty())
                .unwrap_or_else(|| super::DEFAULT_USER_ID.to_string())
        })
    }

    /// `createChatGroupWithMessage`
    pub fn create_chat_group_with_message(
        &self,
        group_id: String,
        owner_user_id: String,
        title: String,
        message: MessageRow,
    ) -> tokio::task::JoinHandle<anyhow::Result<()>> {
        let db = self.db.clone();
        self.runtime.spawn(async move {
            anyhow::ensure!(
                message.chat_group_id == group_id,
                "chat message group does not match the group being created"
            );
            let now = now();
            let mut tx = db.pool().begin().await?;
            sqlx::query(UPSERT_GROUP_SQL)
                .bind(&group_id)
                .bind(&owner_user_id)
                .bind(&title)
                .bind(&message.created_at)
                .bind(&now)
                .execute(&mut *tx)
                .await?;
            upsert_message(&mut tx, &message, &now).await?;
            tx.commit().await?;
            Ok(())
        })
    }

    /// `upsertChatMessage`
    pub fn upsert_chat_message(
        &self,
        message: MessageRow,
    ) -> tokio::task::JoinHandle<anyhow::Result<()>> {
        let db = self.db.clone();
        self.runtime.spawn(async move {
            let mut conn = db.pool().acquire().await?;
            upsert_message(&mut conn, &message, &now()).await
        })
    }

    /// `replaceChatMessage`: upsert the new row and tombstone the previous
    /// assistant message in one transaction.
    pub fn replace_chat_message(
        &self,
        message: MessageRow,
        previous_message_id: String,
    ) -> tokio::task::JoinHandle<anyhow::Result<()>> {
        let db = self.db.clone();
        self.runtime.spawn(async move {
            let now = now();
            let mut tx = db.pool().begin().await?;
            upsert_message(&mut tx, &message, &now).await?;
            if previous_message_id != message.id {
                sqlx::query(
                    "UPDATE chat_messages SET deleted_at = ?, updated_at = ?
                     WHERE chat_group_id = ? AND id = ? AND deleted_at IS NULL",
                )
                .bind(&now)
                .bind(&now)
                .bind(&message.chat_group_id)
                .bind(&previous_message_id)
                .execute(&mut *tx)
                .await?;
            }
            tx.commit().await?;
            Ok(())
        })
    }

    /// `setChatGroupTitleIfCurrent`
    pub fn set_chat_group_title_if_current(
        &self,
        group_id: String,
        expected_title: String,
        title: String,
    ) -> tokio::task::JoinHandle<anyhow::Result<()>> {
        let db = self.db.clone();
        self.runtime.spawn(async move {
            sqlx::query(
                "UPDATE chat_groups
                 SET title = ?, updated_at = ?
                 WHERE id = ? AND title = ? AND deleted_at IS NULL",
            )
            .bind(&title)
            .bind(now())
            .bind(&group_id)
            .bind(&expected_title)
            .execute(db.pool())
            .await?;
            Ok(())
        })
    }

    /// `useRecentChatGroups(scope, limit)` / `useChatGroups(scope)`
    pub fn chat_groups(
        &self,
        scope: Scope,
        limit: Option<i64>,
    ) -> tokio::task::JoinHandle<anyhow::Result<Vec<GroupRow>>> {
        let db = self.db.clone();
        self.runtime.spawn(async move {
            let predicate = match scope {
                Scope::Automations => AUTOMATIONS_SCOPE_EXISTS.to_string(),
                Scope::General => format!("NOT {AUTOMATIONS_SCOPE_EXISTS}"),
            };
            let sql = format!(
                "SELECT g.id, g.owner_user_id, g.title, g.created_at, g.updated_at
                 FROM chat_groups AS g
                 WHERE g.deleted_at IS NULL AND {predicate}
                 ORDER BY g.created_at DESC, g.id DESC
                 {}",
                if limit.is_some() { "LIMIT ?" } else { "" }
            );
            let mut query = sqlx::query_as::<_, GroupRow>(sqlx::AssertSqlSafe(sql));
            if let Some(limit) = limit {
                query = query.bind(limit);
            }
            Ok(query.fetch_all(db.pool()).await?)
        })
    }

    /// `useChatMessages(groupId)`
    pub fn chat_messages(
        &self,
        group_id: String,
    ) -> tokio::task::JoinHandle<anyhow::Result<Vec<MessageRow>>> {
        let db = self.db.clone();
        self.runtime
            .spawn(async move { chat_messages(db.pool(), &group_id).await })
    }

    /// `hydrateSessionContext`'s inputs: the enhancer's content snapshot plus
    /// the session's `created_at` and the meeting chat markdown.
    pub fn chat_session_context(
        &self,
        session_id: String,
    ) -> tokio::task::JoinHandle<anyhow::Result<Option<anlg_template_app::SessionContext>>> {
        let db = self.db.clone();
        self.runtime.spawn(async move {
            let pool = db.pool();
            let Some(snapshot) = super::enhancer::load_snapshot(pool, &session_id).await? else {
                return Ok(None);
            };
            Ok(Some(crate::chat::session_context(&snapshot)))
        })
    }
}

pub(super) async fn chat_messages(
    pool: &SqlitePool,
    group_id: &str,
) -> anyhow::Result<Vec<MessageRow>> {
    Ok(sqlx::query_as::<_, MessageRow>(MESSAGES_SQL)
        .bind(group_id)
        .fetch_all(pool)
        .await?)
}
