use anyhow::Result;

pub mod ops;
pub mod types;

pub async fn migrate(pool: &sqlx::Pool<sqlx::Postgres>) -> Result<()> {
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
}
