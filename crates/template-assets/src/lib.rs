pub const MINIJINJA_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/minijinja");
pub const ASKAMA_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/askama");

#[path = "../minijinja/mod.rs"]
pub mod minijinja;

#[path = "../askama/mod.rs"]
pub mod askama;
