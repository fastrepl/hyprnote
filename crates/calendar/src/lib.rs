#[macro_export]
macro_rules! calendar_common_derives {
    ($item:item) => {
        #[derive(
            Debug,
            PartialEq,
            Clone,
            serde::Serialize,
            serde::Deserialize,
            specta::Type,
            schemars::JsonSchema,
        )]
        $item
    };
}

pub enum Calendar {
    // Apple(hypr_calendar_apple::Calendar),
    Google(hypr_calendar_google::CalendarListEntry),
    Outlook(hypr_calendar_outlook::CalendarData),
}
