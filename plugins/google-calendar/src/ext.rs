use crate::{
    calendar_api::{Calendar, GoogleCalendarApi, Event as GoogleEvent},
    commands::{CalendarSelection, GoogleAccount, MultiAccountStatus},
    contacts_api::{Contact, GoogleContactsApi},
    oauth::{AccessToken, GoogleOAuthClient, GoogleOAuthConfig},
    Error, Result,
};
use chrono::Utc;
use serde::Deserialize;
use std::future::Future;
use tauri_plugin_store::StoreExt;

const GOOGLE_ACCOUNTS_LIST_KEY: &str = "google_accounts_list";

fn get_account_access_token_key(email: &str) -> String {
    format!("google_token_access_{}", email)
}

fn get_account_refresh_token_key(email: &str) -> String {
    format!("google_token_refresh_{}", email)
}

fn get_account_scopes_key(email: &str) -> String {
    format!("google_token_scopes_{}", email)
}

pub trait GoogleCalendarPluginExt<R: tauri::Runtime> {
    fn sync_calendars(&self) -> impl Future<Output = Result<()>>;
    fn get_calendars(&self) -> impl Future<Output = Result<Vec<Calendar>>>;

    fn sync_events(&self, calendar_id: Option<String>) -> impl Future<Output = Result<()>>;
    
    // Internal database-aware sync methods (matching Apple Calendar pattern)
    fn sync_events_with_db(&self, db: hypr_db_user::UserDatabase, user_id: String, calendar_id: Option<String>) -> impl Future<Output = Result<()>>;
    fn sync_calendars_with_db(&self, db: hypr_db_user::UserDatabase, user_id: String) -> impl Future<Output = Result<()>>;

    fn sync_contacts(&self) -> impl Future<Output = Result<()>>;
    fn get_contacts(&self) -> impl Future<Output = Result<Vec<Contact>>>;
    fn search_contacts(&self, query: String) -> impl Future<Output = Result<Vec<Contact>>>;

    fn revoke_access(&self) -> impl Future<Output = Result<()>>;
    fn refresh_tokens(&self) -> impl Future<Output = Result<()>>;

    // Worker methods (matching Apple Calendar pattern)
    fn start_worker(&self, user_id: impl Into<String>) -> impl Future<Output = std::result::Result<(), String>>;
    fn stop_worker(&self);

    // Multi-account methods
    fn get_connected_accounts(&self) -> impl Future<Output = Result<MultiAccountStatus>>;
    fn add_google_account(&self) -> impl Future<Output = Result<String>>;
    fn remove_google_account(&self, email: String) -> impl Future<Output = Result<()>>;
    fn get_calendars_for_account(&self, email: String) -> impl Future<Output = Result<Vec<Calendar>>>;
    fn get_contacts_for_account(&self, email: String) -> impl Future<Output = Result<Vec<Contact>>>;
    
    // Calendar selection methods
    fn get_calendar_selections(&self, email: String) -> impl Future<Output = Result<Vec<CalendarSelection>>>;
    fn set_calendar_selected(&self, email: String, calendar_id: String, selected: bool) -> impl Future<Output = Result<()>>;
    
    // Connection status methods  
    fn get_calendars_needing_reconnection(&self) -> impl Future<Output = Result<Vec<Calendar>>>;
    fn attempt_reconnect_account(&self, email: String) -> impl Future<Output = Result<bool>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> GoogleCalendarPluginExt<R> for T {
    async fn add_google_account(&self) -> Result<String> {
        // Start OAuth flow using tauri-plugin-oauth
        let app_handle = std::sync::Arc::new(self.app_handle().clone());
        let app_handle_clone = app_handle.clone();
        
        // Create a callback handler that implements FnMut
        let callback_handler = move |callback_url: String| {
            let app_handle = app_handle_clone.clone();
            tauri::async_runtime::spawn(async move {
                // Parse the callback URL to extract code and state
                if let Ok(parsed_url) = url::Url::parse(&callback_url) {
                    let query_pairs: std::collections::HashMap<String, String> = parsed_url
                        .query_pairs()
                        .into_owned()
                        .collect();
                        
                    if let (Some(code), Some(_state)) = (query_pairs.get("code"), query_pairs.get("state")) {
                        if let Err(e) = handle_oauth_callback_internal(&*app_handle, code.clone(), _state.clone()).await {
                            tracing::error!("Failed to handle OAuth callback: {}", e);
                        } else {
                            // Trigger calendar sync after successful OAuth
                            if let Err(e) = app_handle.sync_calendars().await {
                                tracing::error!("Failed to sync calendars after OAuth: {}", e);
                            }
                        }
                    }
                }
            });
        };
        
        // Start OAuth server and get the port
        let port = tauri_plugin_oauth::start_with_config(
            tauri_plugin_oauth::OauthConfig {
                ports: Some(vec![5555]), // Use fixed port for consistency
                response: Some("<!DOCTYPE html><html><head><title>Authorization Complete</title></head><body style='font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; background: #f5f5f5;'><div style='background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;'><h2 style='color: #28a745; margin-bottom: 16px;'>Authorization Complete</h2><p style='color: #666; margin-bottom: 24px;'>Your Google Calendar and Contacts have been successfully connected to Hyprnote.</p><p style='color: #999; font-size: 14px;'>You can now close this window and return to the app.</p></div></body></html>".into()),
            },
            callback_handler
        ).map_err(|e| Error::OAuth(format!("Failed to start OAuth server: {}", e)))?;

        // Create OAuth client with the redirect URI that matches the OAuth server
        let redirect_uri = format!("http://localhost:{}", port);
        let oauth_client = get_oauth_client_with_redirect_uri(&redirect_uri)?;
        
        let state = uuid::Uuid::new_v4().to_string();
        let auth_url = oauth_client.get_combined_auth_url(&state);
        
        Ok(auth_url)
    }

    async fn sync_calendars(&self) -> Result<()> {
        // Get database and user_id from state  
        let db_state = self.state::<tauri_plugin_db::ManagedState>();
        let (db, user_id) = {
            let guard = db_state.lock().await;
            let db = guard.db.as_ref().ok_or(Error::Auth("Database not initialized".to_string()))?.clone();
            let user_id = guard.user_id.as_ref().ok_or(Error::Auth("User ID not set".to_string()))?.clone();
            (db, user_id)
        };
        
        self.sync_calendars_with_db(db, user_id).await
    }

    #[tracing::instrument(skip_all)]
    async fn sync_calendars_with_db(&self, db: hypr_db_user::UserDatabase, user_id: String) -> Result<()> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        // Get all connected accounts
        let accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };

        if accounts.is_empty() {
            return Ok(());
        }

        // Sync calendars for each account with calendar access
        for account in accounts.iter().filter(|acc| acc.calendar_access) {
            match sync_account_calendars(self, &db, &user_id, account).await {
                Ok(_) => {},
                Err(e) => {
                    tracing::error!("Failed to sync calendars for {}: {}", account.email, e);
                    // Mark calendars as needing reconnection
                    if let Err(mark_err) = mark_account_calendars_as_disconnected(self, &db, &user_id, account).await {
                        tracing::error!("Failed to mark calendars as disconnected for {}: {}", account.email, mark_err);
                    }
                }
            }
        }
        Ok(())
    }

    // Implement other required trait methods with simple delegation
    async fn sync_events(&self, calendar_id: Option<String>) -> Result<()> {
        // Get database and user_id from state  
        let db_state = self.state::<tauri_plugin_db::ManagedState>();
        let (db, user_id) = {
            let guard = db_state.lock().await;
            let db = guard.db.as_ref().ok_or(Error::Auth("Database not initialized".to_string()))?.clone();
            let user_id = guard.user_id.as_ref().ok_or(Error::Auth("User ID not set".to_string()))?.clone();
            (db, user_id)
        };
        
        self.sync_events_with_db(db, user_id, calendar_id).await
    }

    async fn sync_events_with_db(&self, db: hypr_db_user::UserDatabase, user_id: String, calendar_id: Option<String>) -> Result<()> {
        // Get all Google calendars for this user with status "syncing"
        let calendars = db.list_calendars(&user_id).await
            .unwrap_or_default()
            .into_iter()
            .filter(|cal| {
                cal.platform == hypr_db_user::Platform::Google &&
                cal.connection_status.as_deref() == Some("syncing") &&
                (calendar_id.is_none() || Some(&cal.tracking_id) == calendar_id.as_ref())
            })
            .collect::<Vec<_>>();

        if calendars.is_empty() {
            return Ok(());
        }

        // Get accounts from google.json for token access
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        let accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };

        let calendar_api = GoogleCalendarApi::new();

        // Sync events for each selected calendar
        for calendar in calendars {
            // Find the account for this calendar
            let account = accounts.iter().find(|acc| 
                calendar.account_id.as_deref() == Some(&acc.google_id)
            );
            
            let account = match account {
                Some(acc) => acc,
                None => {
                    tracing::warn!("No account found for calendar: {}", calendar.tracking_id);
                    continue;
                }
            };

            // Get access token for this account
            let token = match get_access_token_for_account(self, &account.email) {
                Ok(token) => token,
                Err(e) => {
                    tracing::warn!("Failed to get access token for account {}: {}", account.email, e);
                    continue;
                }
            };

            // Get events from Google API
            let time_min = chrono::Utc::now();
            let time_max = time_min + chrono::Duration::days(100); // Sync events for next 100 days

            match calendar_api.get_events(&token, &calendar.tracking_id, Some(time_min), Some(time_max)).await {
                Ok(google_events) => {
                    // Convert and upsert Google events to database
                    for google_event in google_events {
                        let db_event = convert_google_event_to_db_event(&google_event, &calendar, &user_id);
                        
                        if let Err(e) = db.upsert_event(db_event).await {
                            tracing::error!("Failed to upsert event {} for calendar {}: {}", google_event.id, calendar.name, e);
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to get events for calendar {} ({}): {}", calendar.name, calendar.tracking_id, e);
                }
            }
        }
        Ok(())
    }

    async fn sync_contacts(&self) -> Result<()> {
        // Placeholder - implement later
        Ok(())
    }

    async fn get_contacts(&self) -> Result<Vec<Contact>> {
        // Placeholder - implement later
        Ok(Vec::new())
    }

    async fn search_contacts(&self, _query: String) -> Result<Vec<Contact>> {
        // Placeholder - implement later
        Ok(Vec::new())
    }

    async fn revoke_access(&self) -> Result<()> {
        // Placeholder - implement later
        Ok(())
    }

    async fn refresh_tokens(&self) -> Result<()> {
        // Placeholder - implement later
        Ok(())
    }

    async fn get_connected_accounts(&self) -> Result<MultiAccountStatus> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        let accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };
        
        Ok(MultiAccountStatus {
            total_accounts: accounts.len() as u32,
            connected_accounts: accounts,
        })
    }

    async fn remove_google_account(&self, email: String) -> Result<()> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        // Get the account to find its google_id before removing
        let accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };

        let account_to_remove = accounts.iter().find(|acc| acc.email == email);
        let google_id = account_to_remove.map(|acc| acc.google_id.clone());
        
        // Remove from google.json
        // 1. Remove account tokens
        store.delete(&get_account_access_token_key(&email));
        store.delete(&get_account_refresh_token_key(&email));
        store.delete(&get_account_scopes_key(&email));
        
        // 2. Remove account from accounts list
        let updated_accounts: Vec<GoogleAccount> = accounts
            .into_iter()
            .filter(|account| account.email != email)
            .collect();
        
        store.set(GOOGLE_ACCOUNTS_LIST_KEY, serde_json::to_value(&updated_accounts)?);
        store.save()?;
        
        // Remove from database
        if let Some(account_google_id) = google_id {
            let db_state = self.state::<tauri_plugin_db::ManagedState>();
            let (db, user_id) = {
                let guard = db_state.lock().await;
                let db = guard.db.as_ref().ok_or(Error::Auth("Database not initialized".to_string()))?.clone();
                let user_id = guard.user_id.as_ref().ok_or(Error::Auth("User ID not set".to_string()))?.clone();
                (db, user_id)
            };
            
            // Get all calendars for this account
            let calendars = db.list_calendars(&user_id).await.unwrap_or_default();
            let calendars_to_remove: Vec<_> = calendars
                .into_iter()
                .filter(|cal| cal.platform == hypr_db_user::Platform::Google && 
                        cal.account_id.as_deref() == Some(&account_google_id))
                .collect();
            
            // Delete calendars and their events
            for calendar in calendars_to_remove {
                // Get all events for the user and filter by calendar_id
                match db.list_events(Some(hypr_db_user::ListEventFilter {
                    common: hypr_db_user::ListEventFilterCommon {
                        user_id: user_id.clone(),
                        limit: None,
                    },
                    specific: hypr_db_user::ListEventFilterSpecific::Simple {},
                })).await {
                    Ok(all_events) => {
                        // Filter events for this specific calendar
                        let events_for_calendar: Vec<_> = all_events
                            .into_iter()
                            .filter(|event| event.calendar_id.as_ref() == Some(&calendar.id))
                            .collect();
                        
                        // Delete each event for this calendar
                        for event in events_for_calendar {
                            if let Err(e) = db.delete_event(&event.id).await {
                                tracing::error!("Failed to delete event {} for removed account {}: {}", event.id, email, e);
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!("Failed to list events for calendar {} during account removal: {}", calendar.id, e);
                    }
                }
                
                // Delete the calendar itself
                if let Err(e) = db.delete_calendar(&calendar.id).await {
                    tracing::error!("Failed to delete calendar {} for removed account {}: {}", calendar.id, email, e);
                }
            }
        }
        
        tracing::info!("Successfully removed Google account: {}", email);
        Ok(())
    }

    async fn get_calendars(&self) -> Result<Vec<Calendar>> {
        // Get from database instead of API
        let db_state = self.state::<tauri_plugin_db::ManagedState>();
        let (db, user_id) = {
            let guard = db_state.lock().await;
            let db = guard.db.as_ref().ok_or(Error::Auth("Database not initialized".to_string()))?.clone();
            let user_id = guard.user_id.as_ref().ok_or(Error::Auth("User ID not set".to_string()))?.clone();
            (db, user_id)
        };

        let calendars = db.list_calendars(&user_id).await
            .unwrap_or_default()
            .into_iter()
            .filter(|cal| cal.platform == hypr_db_user::Platform::Google)
            .map(|db_cal| Calendar {
                id: db_cal.tracking_id,
                summary: db_cal.name,
                description: db_cal.source,
                primary: None,
                access_role: None,
                selected: Some(db_cal.selected),
                color_id: None,
                background_color: None,
                foreground_color: None,
                account_id: db_cal.account_id,
                connection_status: db_cal.connection_status,
                last_sync_error: db_cal.last_sync_error,
                last_sync_at: db_cal.last_sync_at,
            })
            .collect();

        Ok(calendars)
    }

    async fn get_calendars_for_account(&self, _email: String) -> Result<Vec<Calendar>> {
        // Use get_calendars and filter by account
        self.get_calendars().await
    }

    async fn get_contacts_for_account(&self, _email: String) -> Result<Vec<Contact>> {
        // Placeholder - implement later
        Ok(Vec::new())
    }

    async fn get_calendar_selections(&self, email: String) -> Result<Vec<CalendarSelection>> {
        let db_state = self.state::<tauri_plugin_db::ManagedState>();
        let (db, user_id) = {
            let guard = db_state.lock().await;
            let db = guard.db.as_ref().ok_or(Error::Auth("Database not initialized".to_string()))?.clone();
            let user_id = guard.user_id.as_ref().ok_or(Error::Auth("User ID not set".to_string()))?.clone();
            (db, user_id)
        };

        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        let accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };

        let account = accounts.iter().find(|acc| acc.email == email)
            .ok_or_else(|| Error::Auth(format!("Account not found: {}", email)))?;

        let calendars = db.list_calendars(&user_id).await
            .unwrap_or_default()
            .into_iter()
            .filter(|cal| cal.platform == hypr_db_user::Platform::Google && 
                    cal.account_id.as_deref() == Some(&account.google_id))
            .collect::<Vec<_>>();
        
        let mut calendar_selections = Vec::new();
        for calendar in calendars {
            let selected = calendar.connection_status.as_deref() == Some("syncing");
            
            calendar_selections.push(CalendarSelection {
                calendar_id: calendar.tracking_id.clone(),
                calendar_name: calendar.name.clone(),
                selected,
                color: None,
            });
        }
        
        Ok(calendar_selections)
    }

    async fn set_calendar_selected(&self, _email: String, calendar_id: String, selected: bool) -> Result<()> {
        let db_state = self.state::<tauri_plugin_db::ManagedState>();
        let (db, user_id) = {
            let guard = db_state.lock().await;
            let db = guard.db.as_ref().ok_or(Error::Auth("Database not initialized".to_string()))?.clone();
            let user_id = guard.user_id.as_ref().ok_or(Error::Auth("User ID not set".to_string()))?.clone();
            (db, user_id)
        };
        
        if let Ok(calendars) = db.list_calendars(&user_id).await {
            for mut calendar in calendars {
                if calendar.tracking_id == calendar_id && calendar.platform == hypr_db_user::Platform::Google {
                    calendar.selected = selected;
                    
                    if selected {
                        if calendar.connection_status.as_deref() == Some("connected") {
                            calendar.connection_status = Some("syncing".to_string());
                        }
                    } else {
                        calendar.connection_status = Some("connected".to_string());
                    }
                    
                    if let Err(e) = db.upsert_calendar(calendar).await {
                        tracing::error!("Failed to update calendar selection for {}: {}", calendar_id, e);
                    }
                    break;
                }
            }
        }
        
        Ok(())
    }

    async fn get_calendars_needing_reconnection(&self) -> Result<Vec<Calendar>> {
        let db_state = self.state::<tauri_plugin_db::ManagedState>();
        let (db, user_id) = {
            let guard = db_state.lock().await;
            let db = guard.db.as_ref().ok_or(Error::Auth("Database not initialized".to_string()))?.clone();
            let user_id = guard.user_id.as_ref().ok_or(Error::Auth("User ID not set".to_string()))?.clone();
            (db, user_id)
        };

        let calendars = db.list_calendars(&user_id).await
            .unwrap_or_default()
            .into_iter()
            .filter(|cal| cal.platform == hypr_db_user::Platform::Google && 
                    cal.connection_status.as_deref() == Some("needs_reconnection"))
            .map(|db_calendar| Calendar {
                id: db_calendar.tracking_id,
                summary: db_calendar.name,
                description: db_calendar.source,
                primary: None,
                access_role: None,
                selected: Some(db_calendar.selected),
                color_id: None,
                background_color: None,
                foreground_color: None,
                account_id: db_calendar.account_id,
                connection_status: db_calendar.connection_status,
                last_sync_error: db_calendar.last_sync_error,
                last_sync_at: db_calendar.last_sync_at,
            })
            .collect();

        Ok(calendars)
    }

    async fn attempt_reconnect_account(&self, email: String) -> Result<bool> {
        // Try to refresh token and re-sync calendars
        match refresh_token_for_account(self, &email).await {
            Ok(_) => {
                // Re-sync calendars on successful token refresh
                match self.sync_calendars().await {
                    Ok(_) => Ok(true),
                    Err(e) => {
                        tracing::error!("Failed to sync calendars after token refresh for {}: {}", email, e);
                        Ok(false)
                    }
                }
            }
            Err(e) => {
                tracing::error!("Failed to refresh token for {}: {}", email, e);
                Ok(false)
            }
        }
    }

    async fn start_worker(&self, user_id: impl Into<String>) -> std::result::Result<(), String> {
        let db_state = self.state::<tauri_plugin_db::ManagedState>();
        let db = {
            let guard = db_state.lock().await;
            guard.db.clone().ok_or("Database not initialized")?
        };

        let user_id = user_id.into();
        
        // Cast to Wry runtime for the worker - this is safe because we know the desktop app uses Wry
        let app_handle: tauri::AppHandle<tauri::Wry> = unsafe { 
            std::mem::transmute_copy(&self.app_handle())
        };

        let state = self.state::<crate::ManagedState>();
        let mut s = state.lock().unwrap();

        s.worker_handle = Some(tokio::runtime::Handle::current().spawn(async move {
            let _ = crate::worker::monitor(crate::worker::WorkerState { 
                db, 
                user_id, 
                app_handle 
            }).await;
        }));

        Ok(())
    }

    fn stop_worker(&self) {
        let state = self.state::<crate::ManagedState>();
        let mut s = state.lock().unwrap();

        if let Some(handle) = s.worker_handle.take() {
            handle.abort();
        }
    }
}

// Helper function to convert Google Calendar API event to database event
fn convert_google_event_to_db_event(google_event: &GoogleEvent, calendar: &hypr_db_user::Calendar, user_id: &str) -> hypr_db_user::Event {
    // Convert Google event datetime to chrono DateTime
    let start_date = google_event.start.date_time.unwrap_or_else(|| {
        // If no dateTime, parse from date field (all-day events)
        if let Some(date_str) = &google_event.start.date {
            // Parse date-only format "YYYY-MM-DD" and assume start of day UTC
            chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
                .unwrap_or(chrono::Utc::now().date_naive())
                .and_hms_opt(0, 0, 0)
                .unwrap_or(chrono::Utc::now().naive_utc())
                .and_utc()
        } else {
            chrono::Utc::now()
        }
    });

    let end_date = google_event.end.date_time.unwrap_or_else(|| {
        // If no dateTime, parse from date field (all-day events)
        if let Some(date_str) = &google_event.end.date {
            // Parse date-only format "YYYY-MM-DD" and assume start of day UTC
            chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
                .unwrap_or(chrono::Utc::now().date_naive())
                .and_hms_opt(0, 0, 0)
                .unwrap_or(chrono::Utc::now().naive_utc())
                .and_utc()
        } else {
            start_date + chrono::Duration::hours(1) // Default 1-hour duration
        }
    });

    // Extract attendees as a JSON string
    let participants = google_event.attendees.as_ref().and_then(|attendees| {
        if attendees.is_empty() {
            None
        } else {
            serde_json::to_string(attendees).ok()
        }
    });

    hypr_db_user::Event {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.to_string(),
        tracking_id: google_event.id.clone(),
        calendar_id: Some(calendar.id.clone()),
        name: google_event.summary.clone().unwrap_or_else(|| "Untitled Event".to_string()),
        note: google_event.description.clone().unwrap_or_default(),
        start_date,
        end_date,
        event_external_url: google_event.html_link.clone(),
        participants,
        is_recurring: false, // TODO: Detect recurring events properly
    }
}

// Helper function for syncing calendars for a specific account
async fn sync_account_calendars<R: tauri::Runtime, T: tauri::Manager<R>>(
    manager: &T,
    db: &hypr_db_user::UserDatabase,
    user_id: &str,
    account: &GoogleAccount,
) -> Result<()> {
    // Try to get access token, refresh if necessary
    let token = match get_access_token_for_account(manager, &account.email) {
        Ok(token) => token,
        Err(_) => {
            // Try to refresh token
            refresh_token_for_account(manager, &account.email).await?;
            get_access_token_for_account(manager, &account.email)?
        }
    };

    let calendar_api = GoogleCalendarApi::new();
    let google_calendars = calendar_api.get_calendar_list(&token).await?;
    
    let sync_time = chrono::Utc::now();
    
    // Get existing calendars for this account from database
    let existing_calendars = db.list_calendars(user_id).await
        .unwrap_or_default()
        .into_iter()
        .filter(|cal| cal.platform == hypr_db_user::Platform::Google && 
                cal.account_id.as_deref() == Some(&account.google_id))
        .map(|cal| (cal.tracking_id.clone(), cal))
        .collect::<std::collections::HashMap<String, hypr_db_user::Calendar>>();

    for google_calendar in google_calendars {
        let existing_calendar = existing_calendars.get(&google_calendar.id);
        
        let connection_status = if let Some(existing) = existing_calendar {
            existing.connection_status.clone()
        } else {
            if google_calendar.id == account.email {
                Some("syncing".to_string()) // Main calendar gets "syncing" status
            } else {
                Some("connected".to_string()) // Other calendars get "connected" status
            }
        };

        let db_calendar = hypr_db_user::Calendar {
            id: existing_calendar.map_or_else(|| uuid::Uuid::new_v4().to_string(), |c| c.id.clone()),
            tracking_id: google_calendar.id.clone(),
            user_id: user_id.to_string(),
            name: google_calendar.summary,
            platform: hypr_db_user::Platform::Google,
            source: Some(format!("Google Calendar ({})", account.email)),
            selected: existing_calendar.map_or(true, |c| c.selected),
            connection_status,
            account_id: Some(account.google_id.clone()),
            last_sync_error: None, // Clear any previous sync errors
            last_sync_at: Some(sync_time.to_string()),
        };

        // Upsert the calendar to the database
        if let Err(e) = db.upsert_calendar(db_calendar).await {
            tracing::error!("Failed to upsert calendar {} for {}: {}", google_calendar.id, account.email, e);
        }
    }

    Ok(())
}

// Helper function for refreshing tokens for a specific account
async fn refresh_token_for_account<R: tauri::Runtime, T: tauri::Manager<R>>(
    manager: &T,
    email: &str,
) -> Result<()> {
    let store = manager.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
    
    // Get current refresh token
    let refresh_token = store
        .get(&get_account_refresh_token_key(email))
        .and_then(|v| v.as_str().map(|s| s.to_owned()))
        .ok_or_else(|| Error::InvalidToken(format!("No refresh token found for {}", email)))?;

    // Try to refresh the access token
    let oauth_client = get_oauth_client_with_redirect_uri("http://localhost:5555")?;
    let new_token = oauth_client.refresh_token(&refresh_token).await?;
    
    // Update the stored tokens
    store.set(&get_account_access_token_key(email), new_token.access_token.clone());
    
    if let Some(new_refresh_token) = &new_token.refresh_token {
        store.set(&get_account_refresh_token_key(email), new_refresh_token.clone());
    }
    
    if let Some(scope) = &new_token.scope {
        store.set(&get_account_scopes_key(email), scope.clone());
    }
    
    store.save().map_err(|e| Error::Store(e))?;
    
    Ok(())
}

// Helper function for marking account calendars as disconnected
async fn mark_account_calendars_as_disconnected<R: tauri::Runtime, T: tauri::Manager<R>>(
    _manager: &T,
    db: &hypr_db_user::UserDatabase,
    user_id: &str,
    account: &GoogleAccount,
) -> Result<()> {
    let calendars = db.list_calendars(user_id).await.unwrap_or_default();
    
    for mut calendar in calendars {
        if calendar.platform == hypr_db_user::Platform::Google && 
           calendar.account_id.as_deref() == Some(&account.google_id) {
            calendar.connection_status = Some("needs_reconnection".to_string());
            calendar.last_sync_error = Some("Token refresh failed".to_string());
            
            if let Err(e) = db.upsert_calendar(calendar).await {
                tracing::error!("Failed to mark calendar as disconnected: {}", e);
            }
        }
    }
    
    Ok(())
}

// Helper functions
fn get_oauth_client_with_redirect_uri(redirect_uri: &str) -> Result<GoogleOAuthClient> {
    let client_id = option_env!("GOOGLE_CLIENT_ID")
        .ok_or_else(|| {
            Error::Auth("GOOGLE_CLIENT_ID environment variable not set at compile time".to_string())
        })?
        .to_string();

    let client_secret = option_env!("GOOGLE_CLIENT_SECRET")
        .ok_or_else(|| {
            Error::Auth("GOOGLE_CLIENT_SECRET environment variable not set at compile time".to_string())
        })?
        .to_string();

    let config = GoogleOAuthConfig {
        client_id,
        client_secret,
        redirect_uri: redirect_uri.to_string(),
    };

    Ok(GoogleOAuthClient::new(config))
}

// Standalone function for OAuth callback handling
async fn handle_oauth_callback_internal<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    code: String,
    _state: String,
) -> Result<()> {
    // CRITICAL: Must use the EXACT same redirect URI as the authorization request
    let redirect_uri = "http://localhost:5555"; // Must match the fixed port
    let oauth_client = get_oauth_client_with_redirect_uri(redirect_uri)?;
    let token = oauth_client.exchange_code_for_token(&code).await?;
    
    // Get user info to identify the account
    let user_info = get_user_info(&token.access_token).await?;
    
    let store = app.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;

    // Store tokens with account email as key
    store.set(&get_account_access_token_key(&user_info.email), token.access_token.clone());
    if let Some(refresh_token) = &token.refresh_token {
        store.set(&get_account_refresh_token_key(&user_info.email), refresh_token.clone());
    }
    if let Some(scope) = &token.scope {
        store.set(&get_account_scopes_key(&user_info.email), scope.clone());
    }

    // Create GoogleAccount struct
    let google_account = GoogleAccount {
        email: user_info.email.clone(),
        name: user_info.name,
        picture: user_info.picture,
        google_id: user_info.id,
        calendar_access: token.scope.as_ref().map_or(false, |s| s.contains("calendar")),
        contacts_access: token.scope.as_ref().map_or(false, |s| s.contains("contacts")),
        connected_at: Utc::now().to_rfc3339(),
    };

    // Add account to accounts list
    let mut accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
        serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
            .unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };

    // Update existing account or add new one
    if let Some(existing_account) = accounts.iter_mut().find(|acc| acc.email == user_info.email) {
        *existing_account = google_account;
    } else {
        accounts.push(google_account);
    }

    store.set(GOOGLE_ACCOUNTS_LIST_KEY, serde_json::to_value(&accounts)?);
    store.save()?;
    
    Ok(())
}

// Helper to get access token for specific account
fn get_access_token_for_account<R: tauri::Runtime, T: tauri::Manager<R>>(
    manager: &T,
    email: &str,
) -> Result<AccessToken> {
    let store = manager
        .store("google.json")
        .map_err(|e| Error::Auth(format!("Store error: {}", e)))?;

    let access_token = store
        .get(&get_account_access_token_key(email))
        .and_then(|v| v.as_str().map(|s| s.to_owned()))
        .ok_or_else(|| Error::InvalidToken(format!("No access token found for {}", email)))?;

    let refresh_token = store
        .get(&get_account_refresh_token_key(email))
        .and_then(|v| v.as_str().map(|s| s.to_owned()));

    let scope = store
        .get(&get_account_scopes_key(email))
        .and_then(|v| v.as_str().map(|s| s.to_owned()));

    Ok(AccessToken {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: None,
        scope,
    })
}

#[derive(Deserialize)]
struct GoogleUserInfo {
    id: String,
    email: String,
    name: String,
    picture: Option<String>,
}

async fn get_user_info(access_token: &str) -> Result<GoogleUserInfo> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://www.googleapis.com/oauth2/v1/userinfo")
        .bearer_auth(access_token)
        .send()
        .await?;

    if response.status().is_success() {
        let user_info: GoogleUserInfo = response.json().await?;
        Ok(user_info)
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        tracing::error!("Failed to get user info - Status: {}, Response: {}", status, error_text);
        Err(Error::GoogleApi(format!("Failed to get user info: {} - {}", status, error_text)))
    }
}