use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type, schemars::JsonSchema)]
pub struct Contact {
    pub identifier: String,
    pub given_name: Option<String>,
    pub family_name: Option<String>,
    pub middle_name: Option<String>,
    pub organization_name: Option<String>,
    pub job_title: Option<String>,
    pub email_addresses: Vec<String>,
    pub phone_numbers: Vec<String>,
    pub url_addresses: Vec<String>,
    pub image_available: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type, schemars::JsonSchema)]
pub struct Human {
    pub identifier: String,
    pub given_name: Option<String>,
    pub family_name: Option<String>,
    pub middle_name: Option<String>,
    pub organization_name: Option<String>,
    pub job_title: Option<String>,
    pub email_addresses: Vec<String>,
    pub phone_numbers: Vec<String>,
    pub url_addresses: Vec<String>,
    pub image_available: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type, schemars::JsonSchema)]
pub struct Organization {
    pub identifier: String,
    pub name: String,
    pub email_addresses: Vec<String>,
    pub phone_numbers: Vec<String>,
    pub url_addresses: Vec<String>,
    pub image_available: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type, schemars::JsonSchema)]
pub struct ImportResult {
    pub humans: Vec<Human>,
    pub organizations: Vec<Organization>,
}
