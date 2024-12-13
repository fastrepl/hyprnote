#[derive(Debug)]
pub struct Migration {
    pub version: i64,
    pub description: &'static str,
    pub sql: &'static str,
    pub kind: MigrationKind,
}

#[derive(Debug)]
pub enum MigrationKind {
    Up,
    Down,
}

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "20241213001503_initial.up",
        sql: include_str!("../migrations/20241213001503_initial.up.sql"),
        kind: MigrationKind::Up,
    }]
}

#[cfg(test)]
mod tests {
    use sqlx::sqlite::SqlitePool;

    #[sqlx::test]
    async fn test_basic(pool: SqlitePool) -> sqlx::Result<()> {
        let result: (i64,) = sqlx::query_as("SELECT 1").fetch_one(&pool).await?;

        assert_eq!(result.0, 1);
        Ok(())
    }

    #[sqlx::test]
    async fn test_users(pool: SqlitePool) -> sqlx::Result<()> {
        sqlx::query("INSERT INTO users (name) VALUES (?)")
            .bind("Alice")
            .execute(&pool)
            .await?;

        let (id, name): (i64, String) = sqlx::query_as("SELECT id, name FROM users WHERE name = ?")
            .bind("Alice")
            .fetch_one(&pool)
            .await?;

        assert_eq!(name, "Alice");
        assert_eq!(id, 1);
        Ok(())
    }
}
