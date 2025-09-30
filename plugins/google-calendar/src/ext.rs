use crate::{
    calendar_api::{Calendar, GoogleCalendarApi},
    contacts_api::{Contact, GoogleContactsApi},
    oauth::{AccessToken, GoogleOAuthClient, GoogleOAuthConfig},
    Error, Result,
};
pub use crate::commands::{GoogleAccount, MultiAccountStatus, CalendarSelection};
use chrono::Utc;
use serde::Deserialize;
use std::future::Future;
use tauri_plugin_store::StoreExt;
use uuid::Uuid;

// Constants for multi-account support
const GOOGLE_ACCOUNTS_LIST_KEY: &str = "google_accounts_list";

// Helper functions for per-account keys
fn get_account_access_token_key(email: &str) -> String {
    format!("google_access_token_{}", email)
}

fn get_account_refresh_token_key(email: &str) -> String {
    format!("google_refresh_token_{}", email)
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
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> GoogleCalendarPluginExt<R> for T {
        
    #[tracing::instrument(skip_all)]
    async fn add_google_account(&self) -> Result<String> {
        // Start OAuth callback server on a fixed port (5555)
        let fixed_port = 5555u16;
        
        // Create the OAuth callback handler
        let app = self.app_handle().clone();
        let callback_handler = move |callback_url: String| {
            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                // Parse the callback URL to extract code and state
                if let Ok(parsed_url) = url::Url::parse(&callback_url) {
                    let query_pairs: std::collections::HashMap<String, String> = parsed_url
                        .query_pairs()
                        .into_owned()
                        .collect();
                        
                    if let (Some(code), Some(_state)) = (query_pairs.get("code"), query_pairs.get("state")) {
                        if let Err(e) = handle_oauth_callback_internal(&app_clone, code.clone(), _state.clone()).await {
                            tracing::error!("Failed to handle OAuth callback: {}", e);
                        }
                    }
                }
            });
        };
        
        // Start the OAuth server with fixed port configuration
        let _port = tauri_plugin_oauth::start_with_config(
            tauri_plugin_oauth::OauthConfig {
                ports: Some(vec![fixed_port]), // Use fixed port 5555
                response: Some("<!DOCTYPE html><html><head><title>Authorization Complete</title></head><body style='font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; background: #f5f5f5;'><div style='background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;'><h2 style='color: #28a745; margin-bottom: 16px;'>Authorization Complete</h2><p style='color: #666; margin-bottom: 24px;'>Your Google Calendar and Contacts have been successfully connected to Hyprnote.</p><p style='color: #999; font-size: 14px;'>You can now close this window and return to the app.</p></div></body></html>".into()),
            },
            callback_handler
        ).map_err(|e| Error::OAuth(format!("Failed to start OAuth server: {}", e)))?;

        // Create OAuth client with the fixed redirect URI
        let redirect_uri = format!("http://localhost:{}", fixed_port);
        let oauth_client = get_oauth_client_with_redirect_uri(&redirect_uri)?;
        
        let state = Uuid::new_v4().to_string();
        let auth_url = oauth_client.get_combined_auth_url(&state);
        
        Ok(auth_url)
    }

    #[tracing::instrument(skip_all)]
    async fn sync_calendars(&self) -> Result<()> {
        // Get database and user_id from state (following Apple Calendar pattern)
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

        let calendar_api = GoogleCalendarApi::new();
        let mut _sync_errors: Vec<String> = Vec::new();

        for account in accounts.iter().filter(|acc| acc.calendar_access) {
            if let Ok(token) = get_access_token_for_account(self, &account.email) {
                if let Ok(google_calendars) = calendar_api.get_calendar_list(&token).await {
                    for google_calendar in google_calendars {
                        let db_calendar = hypr_db_user::Calendar {
                            id: uuid::Uuid::new_v4().to_string(),
                            tracking_id: google_calendar.id,
                            user_id: user_id.clone(),
                            name: google_calendar.summary,
                            platform: hypr_db_user::Platform::Google,
                            source: Some(format!("Google Calendar ({})", account.email)),
                            selected: true, // Default to selected
                        };

                        // Upsert the calendar to the database
                        let _ = db.upsert_calendar(db_calendar).await;
                    }
                }
            }
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn get_calendars(&self) -> Result<Vec<Calendar>> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        // Get all connected accounts
        let accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };

        let mut all_calendars = Vec::new();
        let calendar_api = GoogleCalendarApi::new();

        for account in accounts.iter().filter(|acc| acc.calendar_access) {
            match get_access_token_for_account(self, &account.email) {
                Ok(token) => {
                    match calendar_api.get_calendar_list(&token).await {
                        Ok(mut calendars) => {
                            // Add account identifier to each calendar
                            for calendar in &mut calendars {
                                calendar.account_email = Some(account.email.clone());
                            }
                            all_calendars.extend(calendars);
                        }
                        Err(e) => {
                            tracing::warn!("Failed to get calendars for {}: {}", account.email, e);
                            // Continue with other accounts
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to get token for {}: {}", account.email, e);
                    // Continue with other accounts
                }
            }
        }

        Ok(all_calendars)
    }

    #[tracing::instrument(skip_all)]
    async fn sync_events(&self, calendar_id: Option<String>) -> Result<()> {
        // Get database and user_id from state (following Apple Calendar pattern)
        let db_state = self.state::<tauri_plugin_db::ManagedState>();
        let (db, user_id) = {
            let guard = db_state.lock().await;
            let db = guard.db.as_ref().ok_or(Error::Auth("Database not initialized".to_string()))?.clone();
            let user_id = guard.user_id.as_ref().ok_or(Error::Auth("User ID not set".to_string()))?.clone();
            (db, user_id)
        };
        
        self.sync_events_with_db(db, user_id, calendar_id).await
    }

    #[tracing::instrument(skip_all)]
    async fn sync_events_with_db(&self, db: hypr_db_user::UserDatabase, user_id: String, _calendar_id: Option<String>) -> Result<()> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        // Get all connected accounts
        let accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };

        let calendar_api = GoogleCalendarApi::new();
        
        let accounts_with_calendar_access: Vec<_> = accounts.iter().filter(|acc| acc.calendar_access).collect();
        
        if accounts_with_calendar_access.is_empty() {
            return Ok(());
        }
        
        for account in accounts_with_calendar_access {
            let token = match get_access_token_for_account(self, &account.email) {
                Ok(token) => token,
                Err(_) => continue,
            };
            
            // Get calendar selections for this account
            let calendar_selections = match self.get_calendar_selections(account.email.clone()).await {
                Ok(selections) => selections,
                Err(_) => continue,
            };
            
            let selected_calendars: Vec<_> = calendar_selections.into_iter()
                .filter(|sel| sel.selected)
                .collect();

            for calendar_selection in selected_calendars {
                // Only sync events from the last month to avoid syncing all historical events
                let now = chrono::Utc::now();
                let to = now + chrono::Duration::days(100);
                
                match calendar_api.get_events(&token, &calendar_selection.calendar_id, Some(now), Some(to)).await {
                    Ok(google_events) => {
                            // Convert Google events to database events
                            for google_event in google_events {
                                let event_id = google_event.id.clone();
                                let google_event_url = format!("https://calendar.google.com/calendar/event?eid={}", &event_id);
                                let db_event = hypr_db_user::Event {
                                    id: uuid::Uuid::new_v4().to_string(),
                                    tracking_id: google_event.id,
                                    user_id: user_id.clone(),
                                    name: google_event.summary.unwrap_or("Untitled".to_string()),
                                    note: google_event.description.unwrap_or_else(|| "".to_string()),
                                    start_date: google_event.start.date_time.unwrap_or_else(|| Utc::now()),
                                    end_date: google_event.end.date_time.unwrap_or_else(|| Utc::now()),
                                    calendar_id: None, // Will be set during calendar sync
                                    google_event_url: Some(google_event_url),
                                    participants: None,
                                    is_recurring: false,
                                };

                                // Upsert the event to the database
                                let _ = db.upsert_event(db_event).await;
                            }
                    },
                    Err(_) => {
                        // Skip calendars that fail to sync
                    }
                }
            }
        }

        Ok(())
    }


    #[tracing::instrument(skip_all)]
    async fn sync_contacts(&self) -> Result<()> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        // Get all connected accounts
        let accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };

        let contacts_api = GoogleContactsApi::new();
        let mut sync_errors = Vec::new();

        for account in accounts.iter().filter(|acc| acc.contacts_access) {
            match get_access_token_for_account(self, &account.email) {
                Ok(token) => {
                    match contacts_api.get_contacts(&token).await {
                        Ok(contacts) => {
                            // Store contacts with account association
                            let contacts_key = format!("cached_contacts_{}", account.email);
                            store.set(&contacts_key, serde_json::to_value(&contacts)?);
                            tracing::debug!("Synced {} contacts for {}", contacts.len(), account.email);
                        }
                        Err(e) => {
                            tracing::warn!("Failed to sync contacts for {}: {}", account.email, e);
                            sync_errors.push(format!("{}: {}", account.email, e));
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to get token for {}: {}", account.email, e);
                    sync_errors.push(format!("{}: {}", account.email, e));
                }
            }
        }

        // Save all changes
        store.save().map_err(|e| Error::Store(e))?;

        // If we had errors syncing some accounts, still return success but log them
        if !sync_errors.is_empty() {
            tracing::warn!("Some contacts failed to sync: {}", sync_errors.join(", "));
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn get_contacts(&self) -> Result<Vec<Contact>> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        // Get all connected accounts
        let accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };

        let mut all_contacts = Vec::new();
        let contacts_api = GoogleContactsApi::new();

        for account in accounts.iter().filter(|acc| acc.contacts_access) {
            match get_access_token_for_account(self, &account.email) {
                Ok(token) => {
                    match contacts_api.get_contacts(&token).await {
                        Ok(mut contacts) => {
                            // Add account identifier to each contact
                            for contact in &mut contacts {
                                contact.account_email = Some(account.email.clone());
                            }
                            all_contacts.extend(contacts);
                        }
                        Err(e) => {
                            tracing::warn!("Failed to get contacts for {}: {}", account.email, e);
                            // Continue with other accounts
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to get token for {}: {}", account.email, e);
                    // Continue with other accounts
                }
            }
        }

        Ok(all_contacts)
    }

    #[tracing::instrument(skip_all)]
    async fn search_contacts(&self, query: String) -> Result<Vec<Contact>> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        // Get all connected accounts
        let accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };

        let mut search_results = Vec::new();
        let contacts_api = GoogleContactsApi::new();

        for account in accounts.iter().filter(|acc| acc.contacts_access) {
            match get_access_token_for_account(self, &account.email) {
                Ok(token) => {
                    match contacts_api.search_contacts(&token, &query).await {
                        Ok(mut contacts) => {
                            // Add account identifier to each contact
                            for contact in &mut contacts {
                                contact.account_email = Some(account.email.clone());
                            }
                            search_results.extend(contacts);
                        }
                        Err(e) => {
                            tracing::warn!("Failed to search contacts for {}: {}", account.email, e);
                            // Continue with other accounts
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to get token for {}: {}", account.email, e);
                    // Continue with other accounts
                }
            }
        }

        Ok(search_results)
    }

    #[tracing::instrument(skip_all)]
    async fn revoke_access(&self) -> Result<()> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        // Remove all multi-account data
        store.delete(GOOGLE_ACCOUNTS_LIST_KEY);
        
        // Get all accounts and remove their tokens
        if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            if let Ok(accounts) = serde_json::from_value::<Vec<GoogleAccount>>(accounts_json) {
                for account in accounts {
                    store.delete(&get_account_access_token_key(&account.email));
                    store.delete(&get_account_refresh_token_key(&account.email));
                    store.delete(&get_account_scopes_key(&account.email));
                }
            }
        }
        
        store.save()?;
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn refresh_tokens(&self) -> Result<()> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        // Get all connected accounts
        let accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };

        let oauth_client = get_oauth_client_with_redirect_uri("http://localhost:5555")?;
        let mut refresh_errors = Vec::new();

        for account in &accounts {
            // Get current tokens for this account
            let refresh_token = match store.get(&get_account_refresh_token_key(&account.email))
                .and_then(|v| v.as_str().map(|s| s.to_owned())) {
                Some(token) => token,
                None => {
                    tracing::warn!("No refresh token found for account: {}", account.email);
                    continue;
                }
            };

            // Try to refresh the access token
            match oauth_client.refresh_token(&refresh_token).await {
                Ok(new_token) => {
                    // Update the stored access token
                    store.set(&get_account_access_token_key(&account.email), new_token.access_token.clone());
                    
                    // Update refresh token if a new one was provided
                    if let Some(new_refresh_token) = &new_token.refresh_token {
                        store.set(&get_account_refresh_token_key(&account.email), new_refresh_token.clone());
                    }
                    
                    // Update scope if provided
                    if let Some(scope) = &new_token.scope {
                        store.set(&get_account_scopes_key(&account.email), scope.clone());
                    }
                    
                    tracing::debug!("Successfully refreshed token for: {}", account.email);
                }
                Err(e) => {
                    tracing::warn!("Failed to refresh token for {}: {}", account.email, e);
                    refresh_errors.push(format!("{}: {}", account.email, e));
                }
            }
        }

        // Save all changes
        store.save().map_err(|e| Error::Store(e))?;

        // If we had errors refreshing some accounts, still return success but log them
        if !refresh_errors.is_empty() {
            tracing::warn!("Some tokens failed to refresh: {}", refresh_errors.join(", "));
        }

        Ok(())
    }

    #[tracing::instrument(skip_all)]
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

    #[tracing::instrument(skip_all)]
    async fn remove_google_account(&self, email: String) -> Result<()> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        // Remove tokens for this account
        store.delete(&get_account_access_token_key(&email));
        store.delete(&get_account_refresh_token_key(&email));
        store.delete(&get_account_scopes_key(&email));
        
        // Remove account from accounts list
        let mut accounts = if let Some(accounts_json) = store.get(GOOGLE_ACCOUNTS_LIST_KEY) {
            serde_json::from_value::<Vec<GoogleAccount>>(accounts_json)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };
        
        accounts.retain(|account| account.email != email);
        store.set(GOOGLE_ACCOUNTS_LIST_KEY, serde_json::to_value(&accounts)?);
        
        store.save()?;
        Ok(())
    }

    #[tracing::instrument(skip_all)]
    async fn get_calendars_for_account(&self, email: String) -> Result<Vec<Calendar>> {
        let token = get_access_token_for_account(self, &email)?;
        let calendar_api = GoogleCalendarApi::new();
        calendar_api.get_calendar_list(&token).await
    }

    #[tracing::instrument(skip_all)]
    async fn get_contacts_for_account(&self, email: String) -> Result<Vec<Contact>> {
        let token = get_access_token_for_account(self, &email)?;
        let contacts_api = GoogleContactsApi::new();
        contacts_api.get_contacts(&token).await
    }

    #[tracing::instrument(skip_all)]
    async fn get_calendar_selections(&self, email: String) -> Result<Vec<CalendarSelection>> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        // Get calendars for this account
        let calendars = self.get_calendars_for_account(email.clone()).await?;
        
        // Get stored selections
        let selections_key = format!("calendar_selections_{}", email);
        let stored_selections: std::collections::HashMap<String, bool> = if let Some(selections_json) = store.get(&selections_key) {
            serde_json::from_value(selections_json).unwrap_or_default()
        } else {
            std::collections::HashMap::new()
        };
        
        let mut calendar_selections = Vec::new();
        for calendar in calendars {
            let selected = stored_selections.get(&calendar.id).cloned().unwrap_or(true); // Default to selected
            
            calendar_selections.push(CalendarSelection {
                calendar_id: calendar.id.clone(),
                calendar_name: calendar.summary.clone(),
                selected,
                color: calendar.background_color.clone(),
            });
        }
        
        Ok(calendar_selections)
    }

    #[tracing::instrument(skip_all)]
    async fn set_calendar_selected(&self, email: String, calendar_id: String, selected: bool) -> Result<()> {
        let store = self.store("google.json").map_err(|e| Error::Auth(format!("Store error: {}", e)))?;
        
        // Get current selections
        let selections_key = format!("calendar_selections_{}", email);
        let mut stored_selections: std::collections::HashMap<String, bool> = if let Some(selections_json) = store.get(&selections_key) {
            serde_json::from_value(selections_json).unwrap_or_default()
        } else {
            std::collections::HashMap::new()
        };
        
        // Update selection
        stored_selections.insert(calendar_id, selected);
        
        // Store updated selections
        store.set(&selections_key, serde_json::to_value(&stored_selections)?);
        store.save()?;
        
        Ok(())
    }

    #[tracing::instrument(skip_all)]
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

    #[tracing::instrument(skip_all)]
    fn stop_worker(&self) {
        let state = self.state::<crate::ManagedState>();
        let mut s = state.lock().unwrap();

        if let Some(handle) = s.worker_handle.take() {
            handle.abort();
        }
    }
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