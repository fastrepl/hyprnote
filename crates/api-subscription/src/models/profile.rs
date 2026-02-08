use serde::{Deserialize, Serialize};

/// User profile from Supabase with billing information
#[derive(Debug, Deserialize, Serialize)]
pub struct Profile {
    pub stripe_customer_id: Option<String>,
}
