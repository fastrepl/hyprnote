use hypr_calendar::CalendarSource;
use hypr_db::user::UserDatabase;

async fn list_events(calendar_id: String) -> Result<Vec<hypr_calendar::Event>, String> {
    let now = time::OffsetDateTime::now_utc();

    let mut events: Vec<hypr_calendar::Event> = Vec::new();

    let filter = hypr_calendar::EventFilter {
        calendar_id,
        from: now.checked_sub(time::Duration::days(30)).unwrap(),
        to: now.checked_add(time::Duration::days(30)).unwrap(),
    };

    #[cfg(target_os = "macos")]
    {
        let apple_events = tauri::async_runtime::spawn_blocking(move || {
            let handle = hypr_calendar::apple::Handle::new();
            futures::executor::block_on(handle.list_events(filter)).unwrap_or(vec![])
        })
        .await
        .map_err(|e| e.to_string())?;

        events.extend(apple_events);
    }

    Ok(events)
}

async fn list_calendars() -> Result<Vec<hypr_calendar::Calendar>, String> {
    let mut calendars: Vec<hypr_calendar::Calendar> = Vec::new();

    #[cfg(target_os = "macos")]
    {
        let apple_calendars = tauri::async_runtime::spawn_blocking(|| {
            let handle = hypr_calendar::apple::Handle::new();
            futures::executor::block_on(handle.list_calendars()).unwrap_or(vec![])
        })
        .await
        .map_err(|e| e.to_string())?;

        calendars.extend(apple_calendars);
    }

    Ok(calendars)
}

pub fn run(db: UserDatabase) {
    tauri::async_runtime::spawn(async move {
        loop {
            let calendar_access = tauri::async_runtime::spawn_blocking(|| {
                let handle = hypr_calendar::apple::Handle::new();
                handle.calendar_access_status()
            })
            .await
            .unwrap_or(false);

            if calendar_access {
                let calendars = list_calendars().await.unwrap_or(vec![]);
                for calendar in calendars {
                    db.upsert_calendar(calendar.into()).await.unwrap();
                }
            }

            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        }
    });
}
