use hypr_calendar::CalendarSource;

pub async fn list_events(calendar_id: String) -> Result<Vec<hypr_calendar::Event>, String> {
    let mut events: Vec<hypr_calendar::Event> = Vec::new();

    let filter = hypr_calendar::EventFilter {
        calendar_id,
        from: time::OffsetDateTime::now_utc()
            .checked_sub(time::Duration::days(30))
            .unwrap(),
        to: time::OffsetDateTime::now_utc()
            .checked_add(time::Duration::days(30))
            .unwrap(),
    };

    #[cfg(target_os = "macos")]
    {
        let apple_events = tokio::task::spawn_blocking(move || {
            let handle = hypr_calendar::apple::Handle::new();
            futures::executor::block_on(handle.list_events(filter)).unwrap_or(vec![])
        })
        .await
        .map_err(|e| e.to_string())?;

        events.extend(apple_events);
    }

    Ok(events)
}

pub async fn list_calendars() -> Result<Vec<hypr_calendar::Calendar>, String> {
    let mut calendars: Vec<hypr_calendar::Calendar> = Vec::new();

    #[cfg(target_os = "macos")]
    {
        let apple_calendars = tokio::task::spawn_blocking(|| {
            let handle = hypr_calendar::apple::Handle::new();
            futures::executor::block_on(handle.list_calendars()).unwrap_or(vec![])
        })
        .await
        .map_err(|e| e.to_string())?;

        calendars.extend(apple_calendars);
    }

    Ok(calendars)
}
