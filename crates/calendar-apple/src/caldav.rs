use base64::Engine as _;
use chrono::{DateTime, Utc};
use hypr_calendar_interface::{
    Calendar, CalendarSource, Error, Event, EventFilter, Participant, Platform,
};
use itertools::Itertools;
use reqwest::header::{HeaderMap, AUTHORIZATION, CONTENT_TYPE};

pub struct CalDavHandle {
    client: reqwest::Client,
    base_url: String,
    username: String,
    password: String,
}

impl CalDavHandle {
    pub fn new() -> Self {
        // On Linux, read credentials from environment variables
        let base_url =
            std::env::var("CALDAV_URL").unwrap_or_else(|_| "https://caldav.icloud.com".to_string());
        let username = std::env::var("CALDAV_USERNAME").unwrap_or_default();
        let password = std::env::var("CALDAV_PASSWORD").unwrap_or_default();

        Self::with_credentials(base_url, username, password)
            .expect("Failed to create CalDAV client")
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

    // Stub methods for compatibility with macOS Handle interface
    pub fn calendar_access_status(&self) -> bool {
        // For CalDAV, we can't check access without making a request
        // Return true if credentials are set
        !self.username.is_empty() && !self.password.is_empty()
    }

    pub fn contacts_access_status(&self) -> bool {
        // CardDAV not implemented yet
        false
    }

    pub fn request_calendar_access(&mut self) {
        // No-op for CalDAV - access is based on credentials
    }

    pub fn request_contacts_access(&mut self) {
        // No-op for CalDAV - CardDAV not implemented yet
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
                "CalDAV PROPFIND failed: {} - {}",
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
                "CalDAV REPORT failed: {} - {}",
                response.status(),
                response.text().await?
            ));
        }

        Ok(response.text().await?)
    }

    fn parse_calendar_list(&self, xml: &str) -> Result<Vec<Calendar>, Error> {
        let doc = roxmltree::Document::parse(xml)?;
        let mut calendars = Vec::new();

        for response in doc.descendants().filter(|n| n.has_tag_name("response")) {
            let href = response
                .descendants()
                .find(|n| n.has_tag_name("href"))
                .and_then(|n| n.text())
                .unwrap_or_default();

            let displayname = response
                .descendants()
                .find(|n| n.has_tag_name("displayname"))
                .and_then(|n| n.text())
                .unwrap_or("Unnamed Calendar");

            // Check if this is a calendar (has calendar resource type)
            let is_calendar = response.descendants().any(|n| n.has_tag_name("calendar"));

            if is_calendar && !href.is_empty() {
                calendars.push(Calendar {
                    id: href.to_string(),
                    platform: Platform::Apple,
                    name: displayname.to_string(),
                    source: Some("iCloud CalDAV".to_string()),
                });
            }
        }

        Ok(calendars)
    }

    fn parse_events(&self, xml: &str, calendar_id: &str) -> Result<Vec<Event>, Error> {
        let doc = roxmltree::Document::parse(xml)?;
        let mut events = Vec::new();

        for response in doc.descendants().filter(|n| n.has_tag_name("response")) {
            let href = response
                .descendants()
                .find(|n| n.has_tag_name("href"))
                .and_then(|n| n.text())
                .unwrap_or_default();

            let calendar_data = response
                .descendants()
                .find(|n| n.has_tag_name("calendar-data"))
                .and_then(|n| n.text());

            if let Some(ical_data) = calendar_data {
                if let Ok(parsed_events) = self.parse_ical(ical_data, calendar_id, &href) {
                    events.extend(parsed_events);
                }
            }
        }

        Ok(events)
    }

    fn parse_ical(
        &self,
        ical_data: &str,
        calendar_id: &str,
        event_href: &str,
    ) -> Result<Vec<Event>, Error> {
        let reader = ical::IcalParser::new(ical_data.as_bytes());
        let mut events = Vec::new();

        for calendar in reader {
            let calendar = calendar?;
            for event in calendar.events {
                let mut event_id = event_href.to_string();
                let mut summary = String::new();
                let mut description = String::new();
                let mut start_date: Option<DateTime<Utc>> = None;
                let mut end_date: Option<DateTime<Utc>> = None;
                let mut attendees: Vec<Participant> = Vec::new();

                for property in event.properties {
                    match property.name.as_str() {
                        "UID" => {
                            if let Some(value) = property.value {
                                event_id = value;
                            }
                        }
                        "SUMMARY" => {
                            if let Some(value) = property.value {
                                summary = value;
                            }
                        }
                        "DESCRIPTION" => {
                            if let Some(value) = property.value {
                                description = value;
                            }
                        }
                        "DTSTART" => {
                            if let Some(value) = property.value {
                                start_date = parse_datetime(&value);
                            }
                        }
                        "DTEND" => {
                            if let Some(value) = property.value {
                                end_date = parse_datetime(&value);
                            }
                        }
                        "ATTENDEE" => {
                            if let Some(value) = property.value {
                                let mut name = String::new();
                                let email = extract_email(&value);

                                // Try to get CN (common name) from params
                                if let Some(ref params) = property.params {
                                    for (key, values) in params {
                                        if key == "CN" && !values.is_empty() {
                                            name = values[0].clone();
                                        }
                                    }
                                }

                                if !email.is_empty() || !name.is_empty() {
                                    attendees.push(Participant {
                                        name,
                                        email: if email.is_empty() { None } else { Some(email) },
                                    });
                                }
                            }
                        }
                        _ => {}
                    }
                }

                if let (Some(start), Some(end)) = (start_date, end_date) {
                    events.push(Event {
                        id: event_id,
                        calendar_id: calendar_id.to_string(),
                        platform: Platform::Apple,
                        name: summary,
                        note: description,
                        participants: attendees,
                        start_date: start,
                        end_date: end,
                        google_event_url: None,
                    });
                }
            }
        }

        Ok(events)
    }
}

impl CalendarSource for CalDavHandle {
    async fn list_calendars(&self) -> Result<Vec<Calendar>, Error> {
        let propfind_body = r#"<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:resourcetype />
    <d:displayname />
    <c:calendar-description />
  </d:prop>
</d:propfind>"#;

        let principal_url = format!("{}/", self.base_url);
        let xml = self.propfind(&principal_url, 1, propfind_body).await?;
        let calendars = self.parse_calendar_list(&xml)?;

        Ok(calendars
            .into_iter()
            .sorted_by(|a, b| a.name.cmp(&b.name))
            .collect())
    }

    async fn list_events(&self, filter: EventFilter) -> Result<Vec<Event>, Error> {
        let start_str = filter.from.format("%Y%m%dT%H%M%SZ").to_string();
        let end_str = filter.to.format("%Y%m%dT%H%M%SZ").to_string();

        let report_body = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag />
    <c:calendar-data />
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="{}" end="{}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>"#,
            start_str, end_str
        );

        let calendar_url = if filter.calendar_tracking_id.starts_with("http") {
            filter.calendar_tracking_id.clone()
        } else {
            format!("{}/{}", self.base_url, filter.calendar_tracking_id)
        };

        let xml = self.report(&calendar_url, &report_body).await?;
        let events = self.parse_events(&xml, &filter.calendar_tracking_id)?;

        Ok(events
            .into_iter()
            .sorted_by(|a, b| a.start_date.cmp(&b.start_date))
            .collect())
    }
}

fn parse_datetime(s: &str) -> Option<DateTime<Utc>> {
    // Try ISO 8601 format first (YYYYMMDDTHHMMSSZ)
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(s, "%Y%m%dT%H%M%SZ") {
        return Some(DateTime::from_naive_utc_and_offset(dt, Utc));
    }

    // Try with timezone
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Some(dt.with_timezone(&Utc));
    }

    // Try date only (YYYYMMDD)
    if let Ok(date) = chrono::NaiveDate::parse_from_str(s, "%Y%m%d") {
        let dt = date.and_hms_opt(0, 0, 0)?;
        return Some(DateTime::from_naive_utc_and_offset(dt, Utc));
    }

    None
}

fn extract_email(attendee_value: &str) -> String {
    // Attendee format: mailto:email@example.com
    if attendee_value.starts_with("mailto:") {
        return attendee_value.trim_start_matches("mailto:").to_string();
    }
    String::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_datetime() {
        let dt1 = parse_datetime("20240315T100000Z");
        assert!(dt1.is_some());

        let dt2 = parse_datetime("20240315");
        assert!(dt2.is_some());
    }

    #[test]
    fn test_extract_email() {
        assert_eq!(extract_email("mailto:test@example.com"), "test@example.com");
    }
}
