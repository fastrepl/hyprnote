use serde_json::Value;
use std::collections::HashMap;

use crate::tera_utils::get_arg;

pub fn render_timeline_view() -> impl tera::Function {
    Box::new(
        move |args: &HashMap<String, Value>| -> tera::Result<Value> {
            let timeline_view: hypr_bridge::TimelineView = get_arg(args, "timeline_view")?;
            Ok(Value::String(timeline_view.to_string()))
        },
    )
}
