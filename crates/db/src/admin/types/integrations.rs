use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
pub struct Integration {
    pub id: String,
    pub user_id: String,
    pub nango_integration_id: hypr_nango::NangoIntegration,
    pub nango_connection_id: String,
}
