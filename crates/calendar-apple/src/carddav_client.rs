use base64::Engine as _;
use hypr_calendar_interface::{Contact, Error, Platform};
use reqwest::header::{HeaderMap, AUTHORIZATION, CONTENT_TYPE};
use vcard_parser::traits::HasValue;
use vcard_parser::vcard::value::Value;
use vcard_parser::vcard::Vcard;

pub struct CardDavHandle {
    client: reqwest::Client,
    base_url: String,
    username: String,
    password: String,
}

impl CardDavHandle {
    pub fn new() -> Self {
        // On Linux, read credentials from environment variables
        let base_url = std::env::var("CARDDAV_URL")
            .unwrap_or_else(|_| "https://contacts.icloud.com".to_string());
        let username = std::env::var("CARDDAV_USERNAME")
            .or_else(|_| std::env::var("CALDAV_USERNAME"))
            .unwrap_or_default();
        let password = std::env::var("CARDDAV_PASSWORD")
            .or_else(|_| std::env::var("CALDAV_PASSWORD"))
            .unwrap_or_default();

        Self::with_credentials(base_url, username, password)
            .expect("Failed to create CardDAV client")
    }

    pub fn with_credentials(
        base_url: String,
        username: String,
        password: String,
    ) -> Result<Self, Error> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        Ok(Self {
            client,
            base_url,
            username,
            password,
        })
    }

    pub fn contacts_access_status(&self) -> bool {
        // For CardDAV, we can't check access without making a request
        // Return true if credentials are set
        !self.username.is_empty() && !self.password.is_empty()
    }

    fn auth_header(&self) -> String {
        let credentials = format!("{}:{}", self.username, self.password);
        format!(
            "Basic {}",
            base64::engine::general_purpose::STANDARD.encode(credentials.as_bytes())
        )
    }

    async fn propfind(&self, url: &str, depth: u8, body: &str) -> Result<String, Error> {
        let mut headers = HeaderMap::new();
        headers.insert(AUTHORIZATION, self.auth_header().parse()?);
        headers.insert(CONTENT_TYPE, "application/xml; charset=utf-8".parse()?);
        headers.insert("Depth", depth.to_string().parse()?);

        let response = self
            .client
            .request(reqwest::Method::from_bytes(b"PROPFIND")?, url)
            .headers(headers)
            .body(body.to_string())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "CardDAV PROPFIND failed: {} - {}",
                response.status(),
                response.text().await?
            ));
        }

        Ok(response.text().await?)
    }

    async fn report(&self, url: &str, body: &str) -> Result<String, Error> {
        let mut headers = HeaderMap::new();
        headers.insert(AUTHORIZATION, self.auth_header().parse()?);
        headers.insert(CONTENT_TYPE, "application/xml; charset=utf-8".parse()?);
        headers.insert("Depth", "1".parse()?);

        let response = self
            .client
            .request(reqwest::Method::from_bytes(b"REPORT")?, url)
            .headers(headers)
            .body(body.to_string())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "CardDAV REPORT failed: {} - {}",
                response.status(),
                response.text().await?
            ));
        }

        Ok(response.text().await?)
    }

    fn parse_addressbook_list(&self, xml: &str) -> Result<Vec<String>, Error> {
        let doc = roxmltree::Document::parse(xml)?;
        let mut addressbooks = Vec::new();

        for response in doc.descendants().filter(|n| n.has_tag_name("response")) {
            let href = response
                .descendants()
                .find(|n| n.has_tag_name("href"))
                .and_then(|n| n.text())
                .unwrap_or_default();

            // Check if this is an addressbook (has addressbook resource type)
            let is_addressbook = response
                .descendants()
                .any(|n| n.has_tag_name("addressbook"));

            if is_addressbook && !href.is_empty() {
                addressbooks.push(href.to_string());
            }
        }

        Ok(addressbooks)
    }

    fn parse_contacts(&self, xml: &str) -> Result<Vec<Contact>, Error> {
        let doc = roxmltree::Document::parse(xml)?;
        let mut contacts = Vec::new();

        for response in doc.descendants().filter(|n| n.has_tag_name("response")) {
            let href = response
                .descendants()
                .find(|n| n.has_tag_name("href"))
                .and_then(|n| n.text())
                .unwrap_or_default();

            let vcard_data = response
                .descendants()
                .find(|n| n.has_tag_name("address-data"))
                .and_then(|n| n.text());

            if let Some(vcard_text) = vcard_data {
                if let Ok(contact) = self.parse_vcard(vcard_text, &href) {
                    contacts.push(contact);
                }
            }
        }

        Ok(contacts)
    }

    fn parse_vcard(&self, vcard_data: &str, contact_href: &str) -> Result<Contact, Error> {
        // Helper to extract text from Value
        let value_to_string = |value: &Value| -> Option<String> {
            match value {
                Value::ValueText(data) => Some(data.value.clone()),
                Value::ValueTextList(data) => {
                    // Use Display trait to convert to string
                    Some(data.to_string())
                }
                Value::ValueUri(data) => Some(data.value.to_string()),
                _ => None,
            }
        };

        // Parse vCard using vcard_parser
        let vcard = Vcard::try_from(vcard_data)
            .map_err(|e| anyhow::anyhow!("Failed to parse vCard: {:?}", e))?;

        let mut given_name = String::new();
        let mut family_name = String::new();
        let mut organization: Option<String> = None;
        let mut emails = Vec::new();
        let mut phone_numbers = Vec::new();
        let mut note: Option<String> = None;
        let mut contact_id = contact_href.to_string();

        // Get UID
        if let Some(uid_prop) = vcard.get_property_by_name("UID") {
            if let Some(uid_str) = value_to_string(uid_prop.get_value()) {
                contact_id = uid_str;
            }
        }

        // Get full name (FN) - use as fallback if N is not present
        if let Some(fn_prop) = vcard.get_property_by_name("FN") {
            if let Some(fn_value) = value_to_string(fn_prop.get_value()) {
                if given_name.is_empty() && family_name.is_empty() {
                    let parts: Vec<&str> = fn_value.split_whitespace().collect();
                    if parts.len() >= 2 {
                        given_name = parts[0].to_string();
                        family_name = parts[1..].join(" ");
                    } else if parts.len() == 1 {
                        given_name = parts[0].to_string();
                    }
                }
            }
        }

        // Get structured name (N) - this overrides FN parsing
        if let Some(n_prop) = vcard.get_property_by_name("N") {
            if let Some(n_value) = value_to_string(n_prop.get_value()) {
                let parts: Vec<&str> = n_value.split(';').collect();
                if parts.len() >= 2 {
                    family_name = parts[0].to_string();
                    given_name = parts[1].to_string();
                }
            }
        }

        // Get organization
        if let Some(org_prop) = vcard.get_property_by_name("ORG") {
            if let Some(org) = value_to_string(org_prop.get_value()) {
                organization = Some(org);
            }
        }

        // Get all email addresses
        for email_prop in vcard.get_properties_by_name("EMAIL") {
            if let Some(email) = value_to_string(email_prop.get_value()) {
                emails.push(email);
            }
        }

        // Get all telephone numbers
        for tel_prop in vcard.get_properties_by_name("TEL") {
            if let Some(tel) = value_to_string(tel_prop.get_value()) {
                phone_numbers.push(tel);
            }
        }

        // Get note
        if let Some(note_prop) = vcard.get_property_by_name("NOTE") {
            if let Some(note_text) = value_to_string(note_prop.get_value()) {
                note = Some(note_text);
            }
        }

        Ok(Contact {
            id: contact_id,
            platform: Platform::Apple,
            given_name,
            family_name,
            organization,
            emails,
            phone_numbers,
            note,
        })
    }

    pub async fn list_contacts(&self) -> Result<Vec<Contact>, Error> {
        // First, discover addressbooks
        let propfind_body = r#"<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:resourcetype />
    <d:displayname />
  </d:prop>
</d:propfind>"#;

        let url = format!("{}/{}/", self.base_url, self.username);
        let xml = self.propfind(&url, 1, propfind_body).await?;
        let addressbooks = self.parse_addressbook_list(&xml)?;

        if addressbooks.is_empty() {
            return Ok(Vec::new());
        }

        // For simplicity, just use the first addressbook
        // In a real implementation, you might want to query all of them
        let addressbook_url = if addressbooks[0].starts_with("http") {
            addressbooks[0].clone()
        } else {
            format!("{}{}", self.base_url, addressbooks[0])
        };

        // Query all contacts in the addressbook
        let report_body = r#"<?xml version="1.0" encoding="UTF-8"?>
<card:addressbook-query xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:getetag />
    <card:address-data />
  </d:prop>
</card:addressbook-query>"#;

        let xml = self.report(&addressbook_url, report_body).await?;
        let contacts = self.parse_contacts(&xml)?;

        Ok(contacts)
    }
}
