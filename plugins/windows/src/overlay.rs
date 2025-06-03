use std::{collections::HashMap, sync::Arc, time::Duration};
use tauri::{AppHandle, Manager, WebviewWindow};
use tokio::{sync::RwLock, time::sleep};

#[derive(Debug, Default, serde::Serialize, serde::Deserialize, specta::Type, Clone, Copy)]
pub struct OverlayBound {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub struct FakeWindowBounds(pub Arc<RwLock<HashMap<String, HashMap<String, OverlayBound>>>>);

impl Default for FakeWindowBounds {
    fn default() -> Self {
        Self(Arc::new(RwLock::new(HashMap::new())))
    }
}

pub fn spawn_overlay_listener(
    app: AppHandle,
    window: WebviewWindow,
) -> tokio::task::JoinHandle<()> {
    window.set_ignore_cursor_events(true).ok();

    tokio::spawn(async move {
        let state = app.state::<FakeWindowBounds>();
        let mut last_ignore_state = true;
        let mut last_focus_state = false;

        loop {
            sleep(Duration::from_millis(1000 / 10)).await;

            let map = state.0.read().await;

            let Some(windows) = map.get(window.label()) else {
                if !last_ignore_state {
                    window.set_ignore_cursor_events(true).ok();
                    last_ignore_state = true;
                }
                continue;
            };

            if windows.is_empty() {
                if !last_ignore_state {
                    window.set_ignore_cursor_events(true).ok();
                    last_ignore_state = true;
                }
                continue;
            };

            let (Ok(window_position), Ok(mouse_position), Ok(scale_factor)) = (
                window.outer_position(),
                window.cursor_position(),
                window.scale_factor(),
            ) else {
                if !last_ignore_state {
                    if let Err(e) = window.set_ignore_cursor_events(true) {
                        tracing::warn!("Failed to set ignore cursor events: {}", e);
                    }
                    last_ignore_state = true;
                }
                continue;
            };

            let mut ignore = true;

            for (_name, bounds) in windows.iter() {
                let x_min = (window_position.x as f64) + bounds.x * scale_factor;
                let x_max = (window_position.x as f64) + (bounds.x + bounds.width) * scale_factor;
                let y_min = (window_position.y as f64) + bounds.y * scale_factor;
                let y_max = (window_position.y as f64) + (bounds.y + bounds.height) * scale_factor;

                if mouse_position.x >= x_min
                    && mouse_position.x <= x_max
                    && mouse_position.y >= y_min
                    && mouse_position.y <= y_max
                {
                    ignore = false;
                    break;
                }
            }

            if ignore != last_ignore_state {
                if let Err(e) = window.set_ignore_cursor_events(ignore) {
                    tracing::warn!("Failed to set ignore cursor events: {}", e);
                }
                last_ignore_state = ignore;
            }

            let focused = window.is_focused().unwrap_or(false);
            if !ignore && !focused {
                // Only try to set focus if we haven't already done so for this hover state
                if !last_focus_state {
                    if window.set_focus().is_ok() {
                        last_focus_state = true;
                    }
                }
            } else if ignore || focused {
                // Reset focus state when cursor leaves or window gains focus naturally
                last_focus_state = false;
            }
        }
    })
}
