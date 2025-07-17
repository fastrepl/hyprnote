use tauri_plugin_windows::HyprWindow;

pub struct Destination {
    pub window: HyprWindow,
    pub url: String,
}

impl Default for Destination {
    fn default() -> Self {
        Self {
            window: HyprWindow::Main,
            url: "/app/new?record=false".to_string(),
        }
    }
}

pub fn parse(url: String) -> Vec<Destination> {
    let parsed_url = match url::Url::parse(&url) {
        Ok(url) => url,
        Err(_) => {
            return vec![Destination::default()];
        }
    };

    match parsed_url.path() {
        "/notification" => parse_notification_query(&parsed_url),
        "/register" => parse_register_query(&parsed_url),
        _ => vec![Destination::default()],
    }
}

fn parse_notification_query(parsed_url: &url::Url) -> Vec<Destination> {
    let url = match parsed_url.query() {
        Some(query) => match serde_qs::from_str::<NotificationQuery>(query) {
            Ok(params) => {
                if let Some(event_id) = params.event_id {
                    format!("/app/note/event/{}", event_id)
                } else {
                    "/app/new?record=true".to_string()
                }
            }
            Err(_) => "/app/new?record=true".to_string(),
        },
        None => "/app/new?record=false".to_string(),
    };

    vec![Destination {
        window: HyprWindow::Main,
        url,
    }]
}

fn parse_register_query(parsed_url: &url::Url) -> Vec<Destination> {
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
        Destination {
            window: HyprWindow::Main,
            url: main_url,
        },
        Destination {
            window: HyprWindow::Settings,
            url: settings_url,
        },
    ]
}

#[derive(serde::Serialize, serde::Deserialize)]
struct NotificationQuery {
    event_id: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct RegisterQuery {
    base_url: String,
    api_key: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_register_query() {
        let url = "hypr://hyprnote.com/register?base_url=http://localhost:3000&api_key=123";

        let dests = parse(url.to_string());
        assert_eq!(dests.len(), 1);

        let dest = dests.first().unwrap();
        assert_eq!(dest.window, HyprWindow::Main);
        assert_eq!(
            dest.url,
            "/app/register?base_url=http://localhost:3000&api_key=123"
        );
    }
}
