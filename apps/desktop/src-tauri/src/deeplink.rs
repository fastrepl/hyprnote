use tauri_plugin_windows::HyprWindow;

#[derive(Debug)]
pub enum DeeplinkAction {
    OpenInternal(HyprWindow, String),
    OpenExternal(String),
}

pub fn parse(url: String) -> Vec<DeeplinkAction> {
    let parsed_url = match url::Url::parse(&url) {
        Ok(url) => url,
        Err(e) => {
            tracing::error!("{}", e);
            return vec![];
        }
    };

    let dests = match parsed_url.path() {
        "/notification" => parse_notification_query(&parsed_url),
        "/register" => parse_register_query(&parsed_url),
        "/license" => parse_license_query(&parsed_url),

        path => {
            vec![DeeplinkAction::OpenInternal(
                HyprWindow::Main,
                path.to_string(),
            )]
        }
    };

    tracing::info!(url = url, dests = ?dests, "deeplink");
    dests
}

fn parse_notification_query(parsed_url: &url::Url) -> Vec<DeeplinkAction> {
    let mut actions = vec![];

    match parsed_url.query() {
        Some(query) => match serde_qs::from_str::<NotificationQuery>(query) {
            Ok(params) => {
                if let Some(event_url) = params.event_url {
                    actions.push(DeeplinkAction::OpenExternal(event_url));
                }
                if let Some(event_id) = params.event_id {
                    actions.push(DeeplinkAction::OpenInternal(
                        HyprWindow::Main,
                        format!("/app/note/event/{}", event_id),
                    ));
                } else {
                    actions.push(DeeplinkAction::OpenInternal(
                        HyprWindow::Main,
                        "/app/new?record=true".to_string(),
                    ));
                }
            }
            Err(e) => {
                tracing::error!("{}", e);

                actions.push(DeeplinkAction::OpenInternal(
                    HyprWindow::Main,
                    "/app/new?record=true".to_string(),
                ));
            }
        },
        None => {
            actions.push(DeeplinkAction::OpenInternal(
                HyprWindow::Main,
                "/app/new?record=false".to_string(),
            ));
        }
    };

    actions
}

fn parse_register_query(parsed_url: &url::Url) -> Vec<DeeplinkAction> {
    let main_url = "/app".to_string();

    let settings_url = match parsed_url.query() {
        Some(query) => match serde_qs::from_str::<RegisterQuery>(query) {
            Ok(params) => format!(
                "/app/settings?baseUrl={}&apiKey={}",
                params.base_url, params.api_key
            ),
            Err(_) => "/app/settings".to_string(),
        },
        None => "/app/settings".to_string(),
    };

    vec![
        DeeplinkAction::OpenInternal(HyprWindow::Main, main_url),
        DeeplinkAction::OpenInternal(HyprWindow::Settings, settings_url),
    ]
}

fn parse_license_query(parsed_url: &url::Url) -> Vec<DeeplinkAction> {
    let main_url = "/app".to_string();

    let settings_url = match parsed_url.query() {
        Some(query) => match serde_qs::from_str::<LicenseQuery>(query) {
            Ok(params) => format!("/app/settings?tab=billing&key={}", params.key),
            Err(_) => "/app/settings".to_string(),
        },
        None => "/app/settings".to_string(),
    };

    vec![
        DeeplinkAction::OpenInternal(HyprWindow::Main, main_url),
        DeeplinkAction::OpenInternal(HyprWindow::Settings, settings_url),
    ]
}

#[derive(serde::Serialize, serde::Deserialize)]
struct NotificationQuery {
    event_id: Option<String>,
    event_url: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct RegisterQuery {
    base_url: String,
    api_key: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct LicenseQuery {
    key: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_register_query() {
        let url = "hypr://hyprnote.com/register?base_url=http://localhost:3000&api_key=123";

        let actions = parse(url.to_string());
        assert_eq!(actions.len(), 2);

        match &actions[0] {
            DeeplinkAction::OpenInternal(window, url) => {
                assert_eq!(*window, HyprWindow::Main);
                assert_eq!(url, "/app");
            }
            _ => panic!("Expected OpenInternal action"),
        }

        match &actions[1] {
            DeeplinkAction::OpenInternal(window, url) => {
                assert_eq!(*window, HyprWindow::Settings);
                assert_eq!(
                    url,
                    "/app/settings?baseUrl=http://localhost:3000&apiKey=123"
                );
            }
            _ => panic!("Expected OpenInternal action"),
        }
    }

    #[test]
    fn test_parse_license_query() {
        let url = "hypr://hyprnote.com/license?key=123";

        let actions = parse(url.to_string());
        assert_eq!(actions.len(), 2);

        match &actions[0] {
            DeeplinkAction::OpenInternal(window, url) => {
                assert_eq!(*window, HyprWindow::Main);
                assert_eq!(url, "/app");
            }
            _ => panic!("Expected OpenInternal action"),
        }

        match &actions[1] {
            DeeplinkAction::OpenInternal(window, url) => {
                assert_eq!(*window, HyprWindow::Settings);
                assert_eq!(url, "/app/settings?tab=billing&key=123");
            }
            _ => panic!("Expected OpenInternal action"),
        }
    }
}
