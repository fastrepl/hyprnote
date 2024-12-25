use crate::types;
use anyhow::Result;

pub trait PostgresExecutor<'c>: sqlx::Executor<'c, Database = sqlx::Postgres> {}
impl<'c, T: sqlx::Executor<'c, Database = sqlx::Postgres>> PostgresExecutor<'c> for T {}

pub async fn create_user<'c, E: PostgresExecutor<'c>>(e: E) -> Result<types::User> {
    let user = types::User::default();

    let ret = sqlx::query_as(
        "INSERT INTO users (
            id, created_at
        ) VALUES (?, ?)
        RETURNING *",
    )
    .bind(user.id)
    .bind(user.created_at)
    .fetch_one(e)
    .await?;

    Ok(ret)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::postgres::PgPool;

    #[sqlx::test]
    async fn test_create_user(pool: PgPool) {
        let user = create_user(&pool).await.unwrap();
        println!("{:?}", user);
    }
}
