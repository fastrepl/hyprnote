mod error;
mod types;
pub mod v0;
pub mod v1;

pub use error::{Error, Result};
pub use types::*;

#[cfg(test)]
mod tests {
    use super::*;

    macro_rules! inspect {
        (v0, $name:ident, $path:expr) => {
            #[tokio::test]
            #[ignore]
            async fn $name() {
                let path = $path;
                let collection = v0::parse_from_sqlite(&path).await.unwrap();
                println!("\n=== {} ===\n{}", path.display(), collection);
            }
        };
        (v1, $name:ident, $path:expr) => {
            #[tokio::test]
            #[ignore]
            async fn $name() {
                let path = $path;
                let collection = v1::parse_from_sqlite(&path).await.unwrap();
                println!("\n=== {} ===\n{}", path.display(), collection);
            }
        };
    }

    inspect!(
        v0,
        test_v0_b,
        dirs::download_dir().unwrap().join("dbs/db-v0-b.sqlite")
    );
    inspect!(
        v0,
        test_v0_c,
        dirs::download_dir().unwrap().join("dbs/db-v0-c.sqlite")
    );

    inspect!(
        v1,
        test_v1_a,
        dirs::download_dir().unwrap().join("dbs/db-v1-a.sqlite")
    );
    inspect!(
        v1,
        test_v1_d,
        dirs::download_dir().unwrap().join("dbs/db-v1-d.sqlite")
    );
    inspect!(
        v1,
        test_v1_e,
        dirs::download_dir().unwrap().join("dbs/db-v1-e.sqlite")
    );
}
