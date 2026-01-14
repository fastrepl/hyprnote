use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BillingRefreshSearch {}

impl BillingRefreshSearch {
    pub fn from_query_params(_: &std::collections::HashMap<String, String>) -> crate::Result<Self> {
        Ok(Self {})
    }
}
