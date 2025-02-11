use super::{AdminDatabase, Device, Organization, User};

pub async fn seed(db: &AdminDatabase) -> Result<(), crate::Error> {
    let org = Organization {
        id: uuid::Uuid::new_v4().to_string(),
        turso_db_name: "yujonglee".to_string(),
        clerk_org_id: Some("org_1".to_string()),
    };

    let user = User {
        id: uuid::Uuid::new_v4().to_string(),
        organization_id: org.id.clone(),
        human_id: uuid::Uuid::new_v4().to_string(),
        timestamp: chrono::Utc::now(),
        clerk_user_id: "user_1".to_string(),
    };

    let device = Device {
        id: uuid::Uuid::new_v4().to_string(),
        timestamp: chrono::Utc::now(),
        user_id: user.id.clone(),
        api_key: "123".to_string(),
        fingerprint: "TODO".to_string(),
    };

    db.upsert_organization(org).await?;
    db.upsert_user(user).await?;
    db.upsert_device(device).await?;
    Ok(())
}
