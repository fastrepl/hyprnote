use crate::{oauth::AccessToken, Error, Result};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Contact {
    #[serde(rename = "resourceName")]
    pub resource_name: String,
    pub names: Option<Vec<ContactName>>,
    #[serde(rename = "emailAddresses")]
    pub email_addresses: Option<Vec<ContactEmailAddress>>,
    #[serde(rename = "phoneNumbers")]
    pub phone_numbers: Option<Vec<ContactPhoneNumber>>,
    pub organizations: Option<Vec<ContactOrganization>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_email: Option<String>, // Track which account this contact belongs to
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ContactName {
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    #[serde(rename = "familyName")]
    pub family_name: Option<String>,
    #[serde(rename = "givenName")]
    pub given_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ContactEmailAddress {
    pub value: String,
    pub r#type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ContactPhoneNumber {
    pub value: String,
    pub r#type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ContactOrganization {
    pub name: Option<String>,
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactList {
    pub connections: Option<Vec<Contact>>,
    #[serde(rename = "nextPageToken")]
    pub next_page_token: Option<String>,
}

pub struct GoogleContactsApi {
    client: reqwest::Client,
    base_url: String,
}

impl GoogleContactsApi {
    const BASE_URL: &'static str = "https://people.googleapis.com/v1";

    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url: Self::BASE_URL.to_string(),
        }
    }

    async fn make_request<T: serde::de::DeserializeOwned>(
        &self,
        url: &str,
        token: &AccessToken,
    ) -> Result<T> {
        let response = self
            .client
            .get(url)
            .header("Authorization", format!("Bearer {}", token.access_token))
            .send()
            .await?;

        if response.status().is_success() {
            let data: T = response.json().await?;
            Ok(data)
        } else {
            let status = response.status();
            let text = response.text().await?;
            Err(Error::GoogleApi(format!("HTTP {}: {}", status, text)))
        }
    }

    pub async fn get_contacts(&self, token: &AccessToken) -> Result<Vec<Contact>> {
        let mut all_contacts = Vec::new();
        let mut page_token: Option<String> = None;

        loop {
            let mut url = format!(
                "{}/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations",
                self.base_url
            );
            
            if let Some(ref token) = page_token {
                url.push_str(&format!("&pageToken={}", token));
            }

            let contact_list: ContactList = self.make_request(&url, token).await?;
            
            if let Some(connections) = contact_list.connections {
                all_contacts.extend(connections);
            }

            if contact_list.next_page_token.is_none() {
                break;
            }
            page_token = contact_list.next_page_token;
        }

        Ok(all_contacts)
    }

    pub async fn search_contacts(&self, token: &AccessToken, query: &str) -> Result<Vec<Contact>> {
        let url = format!(
            "{}/people:searchContacts?query={}&readMask=names,emailAddresses,phoneNumbers,organizations",
            self.base_url, query
        );

        #[derive(Debug, Deserialize)]
        struct SearchResponse {
            results: Option<Vec<SearchResult>>,
        }

        #[derive(Debug, Deserialize)]
        struct SearchResult {
            person: Contact,
        }

        let response: SearchResponse = self.make_request(&url, token).await?;
        
        Ok(response.results
            .unwrap_or_default()
            .into_iter()
            .map(|r| r.person)
            .collect())
    }
}
