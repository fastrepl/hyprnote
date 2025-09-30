use crate::{oauth::AccessToken, Error, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Calendar {
    pub id: String,
    pub summary: String,
    pub description: Option<String>,
    pub primary: Option<bool>,
    pub access_role: Option<String>,
    pub selected: Option<bool>,
    pub color_id: Option<String>,
    pub background_color: Option<String>,
    pub foreground_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_id: Option<String>, // Track which account this calendar belongs to
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connection_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_sync_error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_sync_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalendarList {
    pub items: Vec<Calendar>,
    #[serde(rename = "nextPageToken")]
    pub next_page_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Event {
    pub id: String,
    pub summary: Option<String>,
    pub description: Option<String>,
    pub start: EventDateTime,
    pub end: EventDateTime,
    pub location: Option<String>,
    pub status: Option<String>,
    pub creator: Option<EventCreator>,
    pub organizer: Option<EventOrganizer>,
    pub attendees: Option<Vec<EventAttendee>>,
    pub created: Option<DateTime<Utc>>,
    pub updated: Option<DateTime<Utc>>,
    #[serde(rename = "htmlLink")]
    pub html_link: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EventDateTime {
    #[serde(rename = "dateTime")]
    pub date_time: Option<DateTime<Utc>>,
    pub date: Option<String>,
    #[serde(rename = "timeZone")]
    pub time_zone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EventCreator {
    pub email: Option<String>,
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EventOrganizer {
    pub email: Option<String>,
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EventAttendee {
    pub email: String,
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    #[serde(rename = "responseStatus")]
    pub response_status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventList {
    pub items: Vec<Event>,
    #[serde(rename = "nextPageToken")]
    pub next_page_token: Option<String>,
}

pub struct GoogleCalendarApi {
    client: reqwest::Client,
    base_url: String,
}

impl GoogleCalendarApi {
    const BASE_URL: &'static str = "https://www.googleapis.com/calendar/v3";

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

    pub async fn get_calendar_list(&self, token: &AccessToken) -> Result<Vec<Calendar>> {
        let mut all_calendars = Vec::new();
        let mut page_token: Option<String> = None;

        loop {
            let mut url = format!("{}/users/me/calendarList", self.base_url);
            if let Some(ref token) = page_token {
                url.push_str(&format!("?pageToken={}", token));
            }

            let calendar_list: CalendarList = self.make_request(&url, token).await?;
            all_calendars.extend(calendar_list.items);

            if calendar_list.next_page_token.is_none() {
                break;
            }
            page_token = calendar_list.next_page_token;
        }

        Ok(all_calendars)
    }

    pub async fn get_events(
        &self,
        token: &AccessToken,
        calendar_id: &str,
        time_min: Option<DateTime<Utc>>,
        time_max: Option<DateTime<Utc>>,
    ) -> Result<Vec<Event>> {
        let mut all_events = Vec::new();
        let mut page_token: Option<String> = None;

        loop {
            let encoded_calendar_id = urlencoding::encode(calendar_id);
            let mut url = format!("{}/calendars/{}/events", self.base_url, encoded_calendar_id);
            let mut params = Vec::new();

            if let Some(ref token) = page_token {
                params.push(format!("pageToken={}", token));
            }

            if let Some(time_min) = time_min {
                // Google Calendar API expects UTC dates in Z format, not +00:00 format
                params.push(format!("timeMin={}", time_min.format("%Y-%m-%dT%H:%M:%S%.3fZ")));
            }

            if let Some(time_max) = time_max {
                // Google Calendar API expects UTC dates in Z format, not +00:00 format  
                params.push(format!("timeMax={}", time_max.format("%Y-%m-%dT%H:%M:%S%.3fZ")));
            }

            params.push("singleEvents=true".to_string());
            params.push("orderBy=startTime".to_string());

            if !params.is_empty() {
                url.push('?');
                url.push_str(&params.join("&"));
            }


            match self.make_request::<EventList>(&url, token).await {
                Ok(event_list) => {
                    all_events.extend(event_list.items);
                    if event_list.next_page_token.is_none() {
                        break;
                    }
                    page_token = event_list.next_page_token;
                }
                Err(e) => {
                    // Try with "primary" as fallback for email-based calendar IDs
                    if calendar_id.contains("@") && encoded_calendar_id != "primary" {
                        let mut fallback_url = format!("{}/calendars/primary/events", self.base_url);
                        if !params.is_empty() {
                            fallback_url.push('?');
                            fallback_url.push_str(&params.join("&"));
                        }
                        match self.make_request::<EventList>(&fallback_url, token).await {
                            Ok(event_list) => {
                                all_events.extend(event_list.items);
                                if event_list.next_page_token.is_none() {
                                    break;
                                }
                                page_token = event_list.next_page_token;
                                continue;
                            }
                            Err(_) => {
                                return Err(e); // Return original error
                            }
                        }
                    } else {
                        return Err(e);
                    }
                }
            }
        }

        Ok(all_events)
    }
}
