use crate::admin_common_derives;

admin_common_derives! {
    pub struct Integration {
        pub id: String,
        pub user_id: String,
        pub nango_integration_id: hypr_nango::NangoIntegration,
        pub nango_connection_id: String,
    }
}
