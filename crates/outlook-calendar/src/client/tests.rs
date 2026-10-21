use super::*;
use serde_json::json;
use std::collections::HashMap;

struct FixtureHttp {
    pages: HashMap<String, Result<Vec<u8>, &'static str>>,
}

impl HttpClient for FixtureHttp {
    async fn get(&self, path: &str) -> Result<Vec<u8>, anlg_http::Error> {
        self.pages
            .get(path)
            .expect("unexpected pagination URL")
            .clone()
            .map_err(Into::into)
    }

    async fn post(&self, _: &str, _: Vec<u8>, _: &str) -> Result<Vec<u8>, anlg_http::Error> {
        unreachable!()
    }
    async fn put(&self, _: &str, _: Vec<u8>) -> Result<Vec<u8>, anlg_http::Error> {
        unreachable!()
    }
    async fn patch(&self, _: &str, _: Vec<u8>) -> Result<Vec<u8>, anlg_http::Error> {
        unreachable!()
    }
    async fn delete(&self, _: &str) -> Result<Vec<u8>, anlg_http::Error> {
        unreachable!()
    }
}

async fn list(resource: &str, pages: FixtureHttp) -> Result<Vec<String>, Error> {
    let client = OutlookCalendarClient::new(pages);
    if resource == "/me/calendars" {
        let response = client.list_calendars().await?;
        assert!(response.odata_next_link.is_none());
        Ok(response.value.into_iter().map(|item| item.id).collect())
    } else {
        let mut request = ListEventsRequest {
            calendar_id: "calendar-id".into(),
            ..Default::default()
        };
        if resource.ends_with("calendarView") {
            request.start_date_time = Some("2026-10-01T00:00:00Z".parse().unwrap());
            request.end_date_time = Some("2026-11-01T00:00:00Z".parse().unwrap());
        }
        let response = client.list_events(request).await?;
        assert!(response.odata_next_link.is_none());
        Ok(response.value.into_iter().map(|item| item.id).collect())
    }
}

fn page(ids: &[&str], next: Option<&str>) -> Result<Vec<u8>, &'static str> {
    Ok(serde_json::to_vec(&json!({
        "value": ids.iter().map(|id| json!({"id": id})).collect::<Vec<_>>(),
        "@odata.nextLink": next,
    }))
    .unwrap())
}

#[tokio::test]
async fn explicit_event_limit_preserves_the_bounded_page_and_continuation() {
    for view in [false, true] {
        let resource = if view { "calendarView" } else { "events" };
        let base = format!("/me/calendars/calendar-id/{resource}");
        let next = format!("https://graph.microsoft.com/v1.0{base}?$skiptoken=next");
        let query = if view {
            "startDateTime=2026-10-01T00%3A00%3A00%2B00%3A00&endDateTime=2026-11-01T00%3A00%3A00%2B00%3A00&$top=1"
        } else {
            "$top=1"
        };
        let client = OutlookCalendarClient::new(FixtureHttp {
            pages: HashMap::from([(format!("{base}?{query}"), page(&["first"], Some(&next)))]),
        });
        let response = client
            .list_events(ListEventsRequest {
                calendar_id: "calendar-id".into(),
                top: Some(1),
                start_date_time: view.then(|| "2026-10-01T00:00:00Z".parse().unwrap()),
                end_date_time: view.then(|| "2026-11-01T00:00:00Z".parse().unwrap()),
                ..Default::default()
            })
            .await
            .unwrap();
        assert_eq!(response.value.len(), 1);
        assert_eq!(response.value[0].id, "first");
        assert_eq!(response.odata_next_link.as_deref(), Some(next.as_str()));
    }
}

#[tokio::test]
async fn lists_complete_snapshots_or_errors_without_returning_partial_pages() {
    for resource in [
        "/me/calendars",
        "/me/calendars/calendar-id/events",
        "/me/calendars/calendar-id/calendarView",
    ] {
        let first_path = if resource.ends_with("calendarView") {
            format!(
                "{resource}?startDateTime=2026-10-01T00%3A00%3A00%2B00%3A00&endDateTime=2026-11-01T00%3A00%3A00%2B00%3A00"
            )
        } else {
            resource.into()
        };
        let second_path = format!("{resource}?$skiptoken=opaque%2Btoken%2F%3D&$top=1");
        let last_path = format!("{resource}?$skiptoken=last");
        let second_link = format!("https://graph.microsoft.com/v1.0{second_path}");
        let last_link = format!("https://graph.microsoft.com/v1.0{last_path}");
        let fixture = |last| FixtureHttp {
            pages: HashMap::from([
                (first_path.clone(), page(&["first"], Some(&second_link))),
                (second_path.clone(), page(&[], Some(&last_link))),
                (last_path.clone(), last),
            ]),
        };

        assert_eq!(
            list(resource, fixture(page(&["last"], None)))
                .await
                .unwrap(),
            ["first", "last"]
        );
        assert!(matches!(
            list(resource, fixture(Err("provider unavailable"))).await,
            Err(Error::Http(_))
        ));
        assert!(matches!(
            list(resource, fixture(Ok(b"invalid JSON".to_vec()))).await,
            Err(Error::Json(_))
        ));
        assert!(matches!(
            list(resource, fixture(page(&[], Some(&second_link)))).await,
            Err(Error::RepeatedNextLink)
        ));
        let mut pages = HashMap::new();
        for index in 0..MAX_PAGES {
            let path = if index == 0 {
                first_path.clone()
            } else {
                format!("{resource}?$skiptoken={index}")
            };
            let next = format!(
                "https://graph.microsoft.com/v1.0{resource}?$skiptoken={}",
                index + 1
            );
            pages.insert(path, page(&["item"], Some(&next)));
        }
        assert!(matches!(
            list(resource, FixtureHttp { pages }).await,
            Err(Error::TooManyPages)
        ));
        for invalid in [
            format!("https://graph.microsoft.com/v1.0{resource}"),
            format!("https://graph.microsoft.com/v1.0{resource}?"),
        ] {
            assert!(matches!(
                list(resource, fixture(page(&[], Some(&invalid)))).await,
                Err(Error::InvalidNextLink)
            ));
        }
        for invalid in [
            "https://example.com/v1.0/me/calendars?$skiptoken=x",
            "https://graph.microsoft.com.evil/v1.0/me/calendars?$skiptoken=x",
            "https://graph.microsoft.com/v1.0/me/messages?$skiptoken=x",
            "https://graph.microsoft.com/v1.0/me/calendars/../messages?$skiptoken=x",
            "https://graph.microsoft.com/v1.0/me/calendars?$skiptoken=x#fragment",
            "",
        ] {
            assert!(matches!(
                list(resource, fixture(page(&[], Some(invalid)))).await,
                Err(Error::InvalidNextLink)
            ));
        }
    }
}
