use crate::admin_common_derives;

admin_common_derives! {
    pub struct Billing {
        pub id: String,
        pub organization_id: String,
        #[schemars(skip)]
        pub stripe_subscription: Option<stripe::Subscription>,
        #[schemars(skip)]
        pub stripe_customer: Option<stripe::Customer>,
    }
}

impl Billing {
    pub fn from_row<'de>(row: &'de libsql::Row) -> Result<Self, serde::de::value::Error> {
        Ok(Self {
            id: row.get(0).expect("id"),
            organization_id: row.get(1).expect("organization_id"),
            stripe_subscription: row
                .get_str(2)
                .map(|s| serde_json::from_str(s).unwrap())
                .ok(),
            stripe_customer: row
                .get_str(3)
                .map(|s| serde_json::from_str(s).unwrap())
                .ok(),
        })
    }
}
