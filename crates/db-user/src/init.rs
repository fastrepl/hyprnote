use super::{
    seed::{SeedData, SeedParams},
    UserDatabase,
};

const ONBOARDING_JSON: &str = include_str!("../../../plugins/db/seed/onboarding.json");
const DEV_JSON: &str = include_str!("../../../plugins/db/seed/dev.json");

pub async fn onboarding(db: &UserDatabase, user_id: impl Into<String>) -> Result<(), crate::Error> {
    let user_id = user_id.into();

    SeedData::from_json(
        ONBOARDING_JSON,
        SeedParams {
            user_id,
            now: chrono::Utc::now(),
        },
    )
    .unwrap()
    .push(db)
    .await?;

    Ok(())
}

#[cfg(debug_assertions)]
pub async fn seed(db: &UserDatabase, user_id: impl Into<String>) -> Result<(), crate::Error> {
    let user_id = user_id.into();

    SeedData::from_json(
        DEV_JSON,
        SeedParams {
            user_id: user_id.clone(),
            now: chrono::Utc::now(),
        },
    )
    .unwrap()
    .push(db)
    .await?;

    Ok(())
}
